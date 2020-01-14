const fs = require('fs')
const path = require('path')
const mkdirp = require('mkdirp')
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
  const configuration = getConfigurationFromPluginOpts(pluginOpts)
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

    // if autoconfig activated, insert hook
    if (configuration.writeAutoConfig) {
      browserify.pipeline.splice('emit-deps', 0, createConfigSpy({
        onResult: configuration.writeAutoConfig
      }))
    }

  }
}

module.exports.generatePrelude = generatePrelude
module.exports.createLavamoatPacker = createLavamoatPacker

function getConfigurationFromPluginOpts(pluginOpts) {
  const allowedKeys = new Set(["writeAutoConfig", "config", "configOverride"])
  const invalidKeys = Reflect.ownKeys(pluginOpts).filter(key => !allowedKeys.has(key))
  if (invalidKeys.length) throw new Error(`Lavamoat - Unrecognized options provided '${invalidKeys}'`)

  const configuration = {
    writeAutoConfig: undefined,
    getConfig: undefined,
    configOverride: pluginOpts.configOverride,
    configPath: getConfigPath(pluginOpts)
  }

  if (typeof pluginOpts.config === 'object') {
    configuration.getConfig = () => pluginOpts.config
  } else if (typeof pluginOpts.config === 'function') {
    configuration.getConfig = pluginOpts.config
  } else {
    const tolerateMissingConfig = ('writeAutoConfig' in pluginOpts)
    configuration.getConfig = () => {
      if (!configuration.configPath) {
        throw new Error('LavaMoat - No configuration path')
      }
      const configPath = path.resolve(configuration.configPath)
      const isMissing = !fs.existsSync(configPath)
      if (isMissing) {
        if (tolerateMissingConfig) {
          return {}
        }
        throw new Error(`Lavamoat - Configuration file not found at path: '${configPath}', use writeAutoConfig option to generate one`)
      }

      const configSource = fs.readFileSync(configPath, 'utf8')
      // if override specified, merge
      if (pluginOpts.configOverride) {
        const configOverride = pluginOpts.configOverride
        const configOverrideSource = fs.readFileSync(configOverride, 'utf8')
        const initialConfig = JSON.parse(configSource)
        const overrideConfig = JSON.parse(configOverrideSource)
        const mergedConfig = mergeDeep(initialConfig, overrideConfig)
        return mergedConfig
      }
      return pluginOpts.config
    }
  }

  if (!pluginOpts.writeAutoConfig) {
    // do not trigger parsing of the code for config generation
    configuration.writeAutoConfig = null
  } else if (pluginOpts.writeAutoConfig === true) {
    //output config to a file, path configuration.configPath
    if (!configuration.configPath) {
      throw new Error('LavaMoat - If writeAutoConfig is specified, config must be a string')
    }
    configuration.writeAutoConfig = (configString) => {
      const configPath = path.resolve(configuration.configPath)
      //Ensure parent dir exists
      const configDirectory = path.dirname(configPath)
      mkdirp.sync(configDirectory)
      //Write config to file
      fs.writeFileSync(configPath, configString)
      console.warn(`LavaMoat Config - wrote to "${configPath}"`)
    }
  } else if (typeof pluginOpts.writeAutoConfig === 'function') {
    //to be called with configuration object
    configuration.writeAutoConfig = pluginOpts.writeAutoConfig
  } else {
    // invalid setting, throw an error
    throw new Error('LavaMoat - Unrecognized value for writeAutoConfig')
  }

  return configuration
}

function getConfigPath(pluginOpts) {
  const defaultConfig = './lavamoat/lavamoat-config.json'
  if (!pluginOpts.config) {
    return defaultConfig
  }
  if (typeof pluginOpts.config === 'string') {
    return pluginOpts.config
  } else {
    return null
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