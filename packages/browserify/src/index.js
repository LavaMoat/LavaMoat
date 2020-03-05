const fs = require('fs')
const path = require('path')
const mkdirp = require('mkdirp')
const mergeDeep = require('merge-deep')
const generatePrelude = require('./generatePrelude')
const createCustomPack = require('./createCustomPack')
const { createConfigSpy } = require('./generateConfig')
const { createPackageDataStream } = require('./packageData')
const { makeStringTransform } = require('browserify-transform-tools')

/*  export a Browserify plugin  */
module.exports = plugin

// these are the reccomended arguments for lavaMoat to work well with browserify
module.exports.args = {
  // this option helps with parsing global usage
  insertGlobalVars: {
    global: false
  }
}

function plugin (browserify, pluginOpts) {
  // pluginOpts.config is config path
  const configuration = getConfigurationFromPluginOpts(pluginOpts)
  // setup the plugin in a re-bundle friendly way
  browserify.on('reset', setupPlugin)
  setupPlugin()

  function setupPlugin () {
    // some workarounds for SES strict parsing
    applySesTransforms(browserify)

    // inject package name into module data
    browserify.pipeline.get('emit-deps').unshift(createPackageDataStream())

    // if autoconfig activated, insert hook
    if (configuration.writeAutoConfig) {
      browserify.pipeline.get('emit-deps').push(createConfigSpy({
        onResult: configuration.writeAutoConfig
      }))
    }

    // replace the standard browser-pack with our custom packer
    browserify.pipeline.get('pack').splice(0, 1,
      createLavamoatPacker(configuration)
    )
  }
}

module.exports.generatePrelude = generatePrelude
module.exports.createLavamoatPacker = createLavamoatPacker

function getConfigurationFromPluginOpts (pluginOpts) {
  const allowedKeys = new Set([
    'writeAutoConfig',
    'config',
    'configOverride',
    'includePrelude',
    '_' // Browserify adds this as the first option when running from the command line
  ])
  const invalidKeys = Reflect.ownKeys(pluginOpts).filter(key => !allowedKeys.has(key))
  if (invalidKeys.length) throw new Error(`Lavamoat - Unrecognized options provided '${invalidKeys}'`)

  const configuration = {
    writeAutoConfig: undefined,
    getConfig: undefined,
    configPath: getConfigPath(pluginOpts),
    includePrelude: pluginOpts.includePrelude
  }

  const defaultOverrideConfig = '/lavamoat-config-override.json'

  if (typeof pluginOpts.config === 'function') {
    configuration.getConfig = pluginOpts.config
  } else {
    const tolerateMissingConfig = ('writeAutoConfig' in pluginOpts)
    configuration.getConfig = () => {
      let configSource
      let primaryConfig

      if (typeof pluginOpts.config === 'string') {
        const configPath = path.resolve(configuration.configPath)
        const isMissing = !fs.existsSync(configPath)
        if (!configuration.configPath) {
          throw new Error('LavaMoat - No configuration path')
        }
        if (isMissing) {
          if (tolerateMissingConfig) {
            return {}
          }
          throw new Error(`Lavamoat - Configuration file not found at path: '${configPath}', use writeAutoConfig option to generate one`)
        }
        configSource = fs.readFileSync(configPath, 'utf8')
        primaryConfig = JSON.parse(configSource)
      } else if (typeof pluginOpts.config === 'object') {
        primaryConfig = pluginOpts.config
      } else if (pluginOpts.config === undefined) {
        // set primaryConfig as an empty config
        primaryConfig = { resources: {} }
      }
      // if override specified, merge
      if (pluginOpts.configOverride) {
        let configOverride = pluginOpts.configOverride
        if (typeof configOverride === 'function') {
          configOverride = pluginOpts.configOverride()
          if (typeof configOverride !== 'string' && typeof configOverride !== 'object') {
            throw new Error('LavaMoat - Config override function must return an object or a string.')
          }
        }

        if (typeof configOverride === 'string') {
          const configOverrideSource = fs.readFileSync(configOverride, 'utf-8')
          configOverride = JSON.parse(configOverrideSource)
        } else if (typeof configOverride !== 'object') {
          throw new Error('LavaMoat - Config Override must be a function, string or object')
        }
        // Ensure override config was written correctly
        validateConfig(configOverride)
        const mergedConfig = mergeDeep(primaryConfig, configOverride)
        return mergedConfig
      } else {
        // Otherwise, still merge but only if it already exists
        const configOverridePath = path.join('./lavamoat', defaultOverrideConfig)
        const resolvedPath = path.resolve(configOverridePath)
        if (fs.existsSync(resolvedPath)) {
          const configOverrideSource = fs.readFileSync(resolvedPath, 'utf-8')
          const configOverride = JSON.parse(configOverrideSource)
          const mergedConfig = mergeDeep(primaryConfig, configOverride)
          // Overwrite source config file
          const configPath = configuration.configPath
          fs.writeFileSync(configPath, JSON.stringify(mergedConfig, null, 2))
          return mergedConfig
        }
        return primaryConfig
      }
    }
  }

  if (!pluginOpts.writeAutoConfig) {
    // do not trigger parsing of the code for config generation
    configuration.writeAutoConfig = null
  } else if (pluginOpts.writeAutoConfig === true) {
    // output config to a file, path configuration.configPath
    if (!configuration.configPath) {
      throw new Error('LavaMoat - If writeAutoConfig is specified, config must be a string')
    }
    configuration.writeAutoConfig = (configString) => {
      const configPath = path.resolve(configuration.configPath)
      // Ensure parent dir exists
      const configDirectory = path.dirname(configPath)
      mkdirp.sync(configDirectory)
      // Declare override config file path
      const overrideConfigPath = configDirectory + defaultOverrideConfig
      // Write config to file
      fs.writeFileSync(configPath, configString)
      // Write default override config to file if it doesn't already exist
      if (!fs.existsSync(overrideConfigPath)) {
        const basicConfig = {
          resources: {
            '<root>': {
              packages: {
              }
            }
          }
        }
        fs.writeFileSync(overrideConfigPath, JSON.stringify(basicConfig, null, 2))
        console.warn(`LavaMoat Override Config - wrote to "${overrideConfigPath}"`)
      }
      console.warn(`LavaMoat Config - wrote to "${configPath}"`)
    }
  } else if (typeof pluginOpts.writeAutoConfig === 'function') {
    // to be called with configuration object
    configuration.writeAutoConfig = pluginOpts.writeAutoConfig
  } else {
    // invalid setting, throw an error
    throw new Error('LavaMoat - Unrecognized value for writeAutoConfig')
  }

  return configuration
}

function getConfigPath (pluginOpts) {
  const defaultConfig = './lavamoat/lavamoat-config.json'
  if (!pluginOpts.config) {
    return defaultConfig
  }
  if (typeof pluginOpts.config === 'string') {
    return pluginOpts.config
  }
  return defaultConfig
}

function createLavamoatPacker (configuration) {
  const defaults = {
    raw: true,
    config: configuration.getConfig(),
    prelude: generatePrelude(configuration)
  }

  const packOpts = Object.assign({}, defaults, configuration)
  const customPack = createCustomPack(packOpts)
  return customPack
}

function applySesTransforms (browserify) {
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

function validateConfig (configOverride) {
  if (typeof configOverride !== 'object') {
    throw new Error('LavaMoat - Expected config override to be an object')
  }

  if (!Object.keys(configOverride).includes('resources')) {
    throw new Error("LavaMoat - Expected label 'resources' for configuration key")
  }

  Object.entries(configOverride.resources).forEach(([packageName, packageOpts], index) => {
    const packageOptions = Object.keys(packageOpts)
    const packageEntries = Object.values(packageOpts)
    const optionsWhitelist = ['globals', 'packages']
    const valuesWhitelist = [true, 'write']

    if (!packageOptions.every(packageOpt => optionsWhitelist.includes(packageOpt))) {
      throw new Error("LavaMoat - Unrecognized package options. Expected 'globals' or 'packages'")
    }

    packageEntries.forEach((entry) => {
      Object.values(entry).forEach((value) => {
        if (!valuesWhitelist.includes(value)) {
          throw new Error("LavaMoat - Globals or packages endowments must be equal to 'true'")
        }
      })
    })
  })
}
