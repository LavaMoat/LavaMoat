const fs = require('fs')
const path = require('path')
const clone = require('clone')
const mkdirp = require('mkdirp')
const through = require('through2').obj
const mergeDeep = require('merge-deep')
const { generatePrelude } = require('lavamoat-core')
const jsonStringify = require('json-stable-stringify')
const { createModuleInspectorSpy } = require('./createModuleInspectorSpy.js')
const { createPackageDataStream } = require('./createPackageDataStream.js')
const createCustomPack = require('./createCustomPack')
const { createSesWorkaroundsTransform } = require('./sesTransforms')

// these are the reccomended arguments for lavaMoat to work well with browserify
const reccomendedArgs = {
  // this option helps with parsing global usage
  insertGlobalVars: {
    global: false
  },
  // this option prevents creating unnecesary psuedo-dependencies
  // where packages appear to rely on other packages because they
  // are using each other for code deduplication
  // this also breaks bify-package-factor and related tools
  dedupe: false
}

// primary export is the Browserify plugin
module.exports = plugin
module.exports.generatePrelude = generatePrelude
module.exports.createLavamoatPacker = createLavamoatPacker
module.exports.loadConfig = loadConfig
module.exports.args = reccomendedArgs

function plugin (browserify, pluginOpts) {
  // pluginOpts.config is config path
  const configuration = getConfigurationFromPluginOpts(pluginOpts)
  // setup the plugin in a re-bundle friendly way
  browserify.on('reset', setupPlugin)
  setupPlugin()

  function setupPlugin () {
    // some workarounds for SES strict parsing and evaluation
    browserify.transform(createSesWorkaroundsTransform(), { global: true })

    // inject package name into module data
    browserify.pipeline.get('emit-deps').unshift(createPackageDataStream())

    // if writeAutoConfig activated, insert hook
    if (configuration.writeAutoConfig) {
      browserify.pipeline.get('emit-deps').push(createModuleInspectorSpy({
        // no builtins in the browser (yet!)
        isBuiltin: () => false,
        // write to disk on completion
        onResult: configuration.writeAutoConfig
      }))
    }

    // replace the standard browser-pack with our custom packer
    browserify.pipeline.get('pack').splice(0, 1,
      createLavamoatPacker(configuration)
    )

    if (configuration.writeAutoConfigDebug) {
      const allDeps = {}
      browserify.pipeline.splice('debug', 0, through((dep, _, cb) => {
        const metaData = clone(dep)
        allDeps[metaData.id] = metaData
        cb(null, dep)
      }, (cb) => {
        const serialized = jsonStringify(allDeps, { space: 2 })
        console.warn(`writeAutoConfigDebug - writing to ${configuration.writeAutoConfigDebug}`)
        fs.writeFile(configuration.writeAutoConfigDebug, serialized, cb)
      }))
    }
  }
}

function loadConfig (pluginOpts = {}) {
  const configuration = getConfigurationFromPluginOpts(pluginOpts)
  return configuration.getConfig()
}

function getConfigurationFromPluginOpts (pluginOpts) {
  const aliasMap = {
    'a': 'writeAutoConfig',
    'autoconfig': 'writeAutoConfig',
    'c': 'config',
    'o': 'configOverride',
    'override': 'configOverride',
    'p': 'includePrelude',
    'prelude': 'includePrelude',
    'pc': 'pruneConfig',
    'pruneconfig': 'pruneConfig',
    'd': 'debugMode',
    'debug': 'debugMode',
    'dc': 'writeAutoConfigDebug',
    'debugconfig': 'writeAutoConfigDebug',
    'h': 'help'
  }

  const allowedKeys = new Set([
    ...Object.keys(aliasMap),
    ...new Set(Object.values(aliasMap)),
    '_' // Browserify adds this as the first option when running from the command line
  ])
  const invalidKeys = Reflect.ownKeys(pluginOpts).filter(key => !allowedKeys.has(key))
  if (invalidKeys.length) throw new Error(`Lavamoat - Unrecognized options provided '${invalidKeys}'`)

  Object.entries(pluginOpts).forEach(([key, value]) => {
    if (Object.keys(aliasMap).includes(key)) {
      pluginOpts[aliasMap[key]] = value
    }
  })

  const configuration = {
    writeAutoConfig: undefined,
    getConfig: undefined,
    configPath: getConfigPath(pluginOpts),
    // default true
    includePrelude: 'includePrelude' in pluginOpts ? pluginOpts.includePrelude : true,
    pruneConfig: pluginOpts.pruneConfig,
    debugMode: pluginOpts.debugMode,
    writeAutoConfigDebug: undefined
  }

  const defaultWriteAutoConfigDebug = './module-data.json'
  const defaultOverrideConfig = '/lavamoat-config-override.json'

  if (typeof pluginOpts.config === 'function') {
    configuration.getConfig = pluginOpts.config
  } else {
    const tolerateMissingConfig = pluginOpts.writeAutoConfig
    configuration.getConfig = () => {
      let configSource
      let primaryConfig

      if (pluginOpts.config === undefined || typeof pluginOpts.config === 'string') {
        const configPath = path.resolve(configuration.configPath)
        const configExists = fs.existsSync(configPath)
        if (!configuration.configPath) {
          throw new Error('LavaMoat - No configuration path')
        }
        if (!configExists) {
          if (tolerateMissingConfig) {
            return {}
          }
          throw new Error(`Lavamoat - Configuration file not found at path: '${configPath}', use writeAutoConfig option to generate one`)
        }
        configSource = fs.readFileSync(configPath, 'utf8')
        primaryConfig = JSON.parse(configSource)
      } else if (typeof pluginOpts.config === 'object') {
        primaryConfig = pluginOpts.config
      }
      // if configOverride specified, merge
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
        const configOverridePath = path.join('./', defaultOverrideConfig)
        const resolvedPath = path.resolve(configOverridePath)
        if (fs.existsSync(resolvedPath)) {
          const configOverrideSource = fs.readFileSync(resolvedPath, 'utf-8')
          const configOverride = JSON.parse(configOverrideSource)
          const mergedConfig = mergeDeep(primaryConfig, configOverride)
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
    configuration.writeAutoConfig = (config) => {
      const configString = jsonStringify(config, { space: 2 })
      const configPath = path.resolve(configuration.configPath)
      // Ensure parent dir exists
      const configDirectory = path.dirname(configPath)
      mkdirp.sync(configDirectory)
      // Declare override config file path
      const overrideConfigPath = configDirectory + defaultOverrideConfig
      // Write config to file
      fs.writeFileSync(configPath, configString)
      console.warn(`LavaMoat Config - wrote to "${configPath}"`)
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
    }
  } else if (typeof pluginOpts.writeAutoConfig === 'function') {
    // to be called with configuration object
    configuration.writeAutoConfig = pluginOpts.writeAutoConfig
  } else {
    // invalid setting, throw an error
    throw new Error('LavaMoat - Unrecognized value for writeAutoConfig')
  }

  if (typeof pluginOpts.writeAutoConfigDebug === 'string') {
    configuration.writeAutoConfigDebug = pluginOpts.writeAutoConfigDebug
  } else if (pluginOpts.writeAutoConfigDebug) {
    configuration.writeAutoConfigDebug = defaultWriteAutoConfigDebug
  }

  return configuration
}

function getConfigPath (pluginOpts) {
  const defaultPath = './lavamoat-config.json'
  if (!pluginOpts.config) {
    return defaultPath
  }
  if (typeof pluginOpts.config === 'string') {
    return pluginOpts.config
  }
  return defaultPath
}

function createLavamoatPacker (configuration = {}) {
  const { config, getConfig, includePrelude } = configuration
  const defaults = {
    raw: true,
    config: config || (getConfig && getConfig()),
    prelude: includePrelude && generatePrelude(configuration)
  }

  const packOpts = Object.assign({}, defaults, configuration)
  const customPack = createCustomPack(packOpts)
  return customPack
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
