const fs = require('fs')
const path = require('path')
const mergeDeep = require('merge-deep')
const jsonStringify = require('json-stable-stringify')
const generatePrelude = require('./generatePrelude')
const createCustomPack = require('./createCustomPack')
const { createConfigSpy } = require('./generateConfig')
const { createPackageDataStream } = require('./packageData')
const { wrapIntoModuleInitializer } = require('./sourcemaps')
const { makeStringTransform } = require('browserify-transform-tools');

/*  export a Browserify plugin  */
module.exports = plugin

// these are the reccomended arguments for lavaMoat to work well with browserify
module.exports.args = {
  // this option helps with parsing global usage
  insertGlobalVars: {
    global: false,
  }
}

function plugin (browserify, pluginOpts) {
  //pluginOpts.config is config path
  const configuration = {
    writeAutoConfig: pluginOpts.writeAutoConfig,
    getConfig: () => {
      return getConfigFrom(pluginOpts)
    },
    configOverride: pluginOpts.configOverride,
    generateAutoConfig: pluginOpts.autoConfig,
    autoConfigPath: getConfigPath(pluginOpts)
  }
  // setup the plugin in a re-bundle friendly way
  browserify.on('reset', setupPlugin)
  setupPlugin()
  // override browserify/browser-pack prelude
  function setupPlugin () {
    
    applySesTransforms(browserify)
    
    const customPack = createLavamoatPacker(configuration)
    // replace the standard browser-pack with our custom packer
    browserify.pipeline.splice('pack', 1, customPack)
    
    // inject package name into module data
    browserify.pipeline.splice('emit-deps', 0, createPackageDataStream())
    // helper to dump autoconfig to a file
    if (configuration.writeAutoConfig) {
      if (typeof configuration.autoConfigPath !== 'string') {
        throw new Error('LavaMoat - "writeAutoConfig" was specified but "config" is not a string')
      }

      if (!fs.existsSync(configuration.autoConfigPath)) {
        fs.mkdirSync("./lavamoat")
      }

      configuration.generateAutoConfig = function writeAutoConfig (autoConfig) {
        fs.writeFileSync(configuration.autoConfigPath, autoConfig)
        console.warn(`LavaMoat Config - wrote to "${configuration.autoConfigPath}"`)
      }

    }
    // if autoconfig activated, insert hook
    if (configuration.generateAutoConfig) {
      browserify.pipeline.splice('emit-deps', 0, createConfigSpy({
        onResult: configuration.generateAutoConfig
      }))
    }
    
  }
}

module.exports.generatePrelude = generatePrelude
module.exports.createLavamoatPacker = createLavamoatPacker

function getConfigFrom(pluginOpts) {
  if (!pluginOpts.config && !pluginOpts.dryRun) {
    const defaultConfig = './lavamoat/lavamoat-config.json'
    if (pluginOpts.writeAutoConfig) {
      return
    }
    if (!fs.existsSync(defaultConfig)) {
      return {}
    }
    const configSource = fs.readFileSync(defaultConfig, 'utf8')
    // if override specified, merge
    if (pluginOpts.configOverride) {
      const configOverride = pluginOpts.configOverride
      const configOverrideSource = fs.readFileSync(configOverride, 'utf8')
      const initialConfig = JSON.parse(configSource)
      const overrideConfig = JSON.parse(configOverrideSource)
      const mergedConfig = mergeDeep(initialConfig, overrideConfig)
      return mergedConfig
    }
    return configSource
  }
  return pluginOpts.config
}

function getConfigPath(pluginOpts) {
  if (pluginOpts.writeAutoConfig) {
    if (!pluginOpts.config) {
      const defaultConfig = './lavamoat/lavamoat-config.json'
      return defaultConfig
    }
    return pluginOpts.config
  }
}

function createLavamoatPacker (opts) {
  const onSourcemap = opts.onSourcemap || (row => row.sourceFile)
  const defaults = {
    raw: true,
    prelude: generatePrelude(opts),
    bundleEntryForModule: (entry) => {
      const { package: packageName, source, deps } = entry
      const wrappedBundle = wrapIntoModuleInitializer(source)
      const sourceMappingURL = onSourcemap(entry, wrappedBundle)
      // for now, ignore new sourcemap and just append original filename
      let moduleInitSrc = wrappedBundle.code
      if (sourceMappingURL) moduleInitSrc += `\n//# sourceMappingURL=${sourceMappingURL}`
      // serialize final module entry
      const serializedDeps = jsonStringify(deps)
      // TODO: re-add "file" for better debugging
      const serializedEntry = `{ package: "${packageName}", deps: ${serializedDeps}, source: ${moduleInitSrc}\n}`
      return serializedEntry
    }
  }

  const packOpts = Object.assign({}, defaults, opts)
  const customPack = createCustomPack(packOpts)
  return customPack
}

function applySesTransforms(browserify) {
  const removeHtmlComment = makeStringTransform('remove-html-comment', { excludeExtension: ['.json'] }, (content, _, cb) => {
    const hideComments = content.split('-->').join('-- >')
    // bluebird uses eval, sorta
    const hideEval = hideComments.split(' eval(').join(' (eval)(')
    cb(null, hideEval)
  })

  const changeImportString = makeStringTransform('remove-import-string', { excludeExtension: ['.json'] }, (content, _, cb) => {
    const hideImport = content.split('import').join('_import')
    // bluebird uses eval, sorta
    const hideEval = hideImport.split(' eval(').join(' (eval)(')
    cb(null, hideEval)
  })

  browserify.transform(removeHtmlComment, { global: true })
  browserify.transform(changeImportString, { global: true })
}