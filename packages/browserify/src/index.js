const fs = require('fs')
const path = require('path')
const clone = require('clone')
const mkdirp = require('mkdirp')
const through = require('through2').obj
const mergeDeep = require('merge-deep')
const { generatePrelude, getDefaultPaths } = require('lavamoat-core')
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
module.exports.loadPolicy = loadPolicy
module.exports.args = reccomendedArgs

function plugin (browserify, pluginOpts) {
  // pluginOpts.policy is policy path
  const configuration = getConfigurationFromPluginOpts(pluginOpts)
  // setup the plugin in a re-bundle friendly way
  browserify.on('reset', setupPlugin)
  setupPlugin()

  function setupPlugin () {
    // some workarounds for SES strict parsing and evaluation
    browserify.transform(createSesWorkaroundsTransform(), { global: true })

    // inject package name into module data
    browserify.pipeline.get('emit-deps').unshift(createPackageDataStream())

    // if writeAutoPolicy activated, insert hook
    if (configuration.writeAutoPolicy) {
      browserify.pipeline.get('emit-deps').push(createModuleInspectorSpy({
        // no builtins in the browser (yet!)
        isBuiltin: () => false,
        // write to disk on completion
        onResult: configuration.writeAutoPolicy
      }))
    }

    // replace the standard browser-pack with our custom packer
    browserify.pipeline.get('pack').splice(0, 1,
      createLavamoatPacker(configuration)
    )

    if (configuration.writeAutoPolicyDebug) {
      const allDeps = {}
      browserify.pipeline.splice('debug', 0, through((dep, _, cb) => {
        const metaData = clone(dep)
        allDeps[metaData.id] = metaData
        cb(null, dep)
      }, (cb) => {
        const serialized = jsonStringify(allDeps, { space: 2 })
        console.warn(`writeAutoPolicyDebug - writing to ${configuration.writeAutoPolicyDebug}`)
        fs.writeFile(configuration.writeAutoPolicyDebug, serialized, cb)
      }))
    }
  }
}

function loadPolicy (pluginOpts = {}) {
  const configuration = getConfigurationFromPluginOpts(pluginOpts)
  return configuration.getPolicy()
}

function getConfigurationFromPluginOpts (pluginOpts) {
  const aliasMap = {
    a: 'writeAutoPolicy',
    autopolicy: 'writeAutoPolicy',
    p: 'policy',
    o: 'policyOverride',
    override: 'policyOverride',
    dp: 'writeAutoPolicyDebug',
    debugpolicy: 'writeAutoPolicyDebug',
    pr: 'includePrelude',
    prelude: 'includePrelude',
    pp: 'prunePolicy',
    prunepolicy: 'prunePolicy',
    d: 'debugMode',
    debug: 'debugMode',
    pn: 'policyName'
  }

  const allowedKeys = new Set([
    ...Object.keys(aliasMap),
    ...Object.values(aliasMap),
    '_' // Browserify adds this as the first option when running from the command line
  ])
  const invalidKeys = Reflect.ownKeys(pluginOpts).filter(key => !allowedKeys.has(key))
  if (invalidKeys.length) throw new Error(`Lavamoat - Unrecognized options provided '${invalidKeys}'`)

  // applying alias to pluginOpts
  Object.entries(pluginOpts).forEach(([key, value]) => {
    if (Object.keys(aliasMap).includes(key)) {
      pluginOpts[aliasMap[key]] = value
    }
  })

  if (!pluginOpts.policyName) {
    pluginOpts.policyName = 'browserify'
  }

  const configuration = {
    writeAutoPolicy: undefined,
    getPolicy: undefined,
    policyPath: getPolicyPath(pluginOpts),
    // default true
    includePrelude: 'includePrelude' in pluginOpts ? pluginOpts.includePrelude : true,
    pruneConfig: pluginOpts.prunePolicy,
    debugMode: pluginOpts.debugMode,
    writeAutoPolicyDebug: undefined
  }

  const { debug } = getDefaultPaths(pluginOpts.policyName)
  const { override } = getDefaultPaths(pluginOpts.policyName)

  if (typeof pluginOpts.policy === 'function') {
    configuration.getPolicy = pluginOpts.policy
  } else {
    const tolerateMissingConfig = pluginOpts.writeAutoPolicy
    configuration.getPolicy = () => {
      let configSource
      let primaryConfig

      if (pluginOpts.policy === undefined || typeof pluginOpts.policy === 'string') {
        const policyPath = path.resolve(configuration.policyPath)
        const configExists = fs.existsSync(policyPath)
        if (!configuration.policyPath) {
          throw new Error('LavaMoat - No configuration path')
        }
        if (!configExists) {
          if (tolerateMissingConfig) {
            return {}
          }
          throw new Error(`Lavamoat - Configuration file not found at path: '${policyPath}', use writeAutoPolicy option to generate one`)
        }
        configSource = fs.readFileSync(policyPath, 'utf8')
        primaryConfig = JSON.parse(configSource)
      } else if (typeof pluginOpts.policy === 'object') {
        primaryConfig = pluginOpts.policy
      }
      // if configOverride specified, merge
      if (pluginOpts.configOverride) {
        let configOverride = pluginOpts.configOverride
        if (typeof configOverride === 'function') {
          configOverride = pluginOpts.configOverride()
          if (typeof configOverride !== 'string' && typeof configOverride !== 'object') {
            throw new Error('LavaMoat - Policy override function must return an object or a string.')
          }
        }

        if (typeof configOverride === 'string') {
          const configOverrideSource = fs.readFileSync(configOverride, 'utf-8')
          configOverride = JSON.parse(configOverrideSource)
        } else if (typeof configOverride !== 'object') {
          throw new Error('LavaMoat - Policy Override must be a function, string or object')
        }
        // Ensure override policy was written correctly
        validateConfig(configOverride)
        const mergedConfig = mergeDeep(primaryConfig, configOverride)
        return mergedConfig
      } else {
        // Otherwise, still merge but only if it already exists
        const configOverridePath = path.join('./', override)
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

  if (!pluginOpts.writeAutoPolicy) {
    // do not trigger parsing of the code for policy generation
    configuration.writeAutoPolicy = null
  } else if (pluginOpts.writeAutoPolicy === true) {
    // output policy to a file, path configuration.policyPath
    if (!configuration.policyPath) {
      throw new Error('LavaMoat - If writeAutoPolicy is specified, policy must be a string')
    }
    configuration.writeAutoPolicy = (policy) => {
      const configString = jsonStringify(policy, { space: 2 })
      const policyPath = path.resolve(configuration.policyPath)
      // Ensure parent dir exists
      const configDirectory = path.dirname(policyPath)
      mkdirp.sync(configDirectory)
      // Declare override policy file path
      const overrideConfigPath = path.join('./', override)
      // Write policy to file
      fs.writeFileSync(policyPath, configString)
      console.warn(`LavaMoat Policy - wrote to "${policyPath}"`)
      // Write default override colicy to file if it doesn't already exist
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
        console.warn(`LavaMoat Override Policy - wrote to "${overrideConfigPath}"`)
      }
    }
  } else if (typeof pluginOpts.writeAutoPolicy === 'function') {
    // to be called with configuration object
    configuration.writeAutoPolicy = pluginOpts.writeAutoPolicy
  } else {
    // invalid setting, throw an error
    throw new Error('LavaMoat - Unrecognized value for writeAutoPolicy')
  }

  if (typeof pluginOpts.writeAutoPolicyDebug === 'string') {
    configuration.writeAutoPolicyDebug = pluginOpts.writeAutoPolicyDebug
  } else if (pluginOpts.writeAutoPolicyDebug) {
    configuration.writeAutoPolicyDebug = debug
  }

  return configuration
}

function getPolicyPath (pluginOpts) {
  const { primary } = getDefaultPaths(pluginOpts.policyName)
  if (!pluginOpts.policy) {
    return primary
  }
  if (typeof pluginOpts.policy === 'string') {
    return pluginOpts.policy
  }
  return primary
}

function createLavamoatPacker (configuration = {}) {
  const { policy, getPolicy, includePrelude } = configuration
  const defaults = {
    raw: true,
    config: policy || (getPolicy && getPolicy()),
    prelude: includePrelude && generatePrelude(configuration)
  }

  const packOpts = Object.assign({}, defaults, configuration)
  const customPack = createCustomPack(packOpts)
  return customPack
}

function validateConfig (configOverride) {
  if (typeof configOverride !== 'object') {
    throw new Error('LavaMoat - Expected policy override to be an object')
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
