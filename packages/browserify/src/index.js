const fs = require('fs')
const path = require('path')
const { generatePrelude, getDefaultPaths, mergeConfig } = require('lavamoat-core')
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
        // should prepare debug info
        includeDebugInfo: configuration.writeAutoConfigDebug,
        // write policy files to disk
        onResult: (policy) => writeAutoConfig(policy, configuration)
      }))
    }

    // replace the standard browser-pack with our custom packer
    browserify.pipeline.get('pack').splice(0, 1, createLavamoatPacker(configuration))
  }
}

function loadConfig (pluginOpts = {}) {
  const configuration = getConfigurationFromPluginOpts(pluginOpts)
  return loadPolicy(configuration)
}

function getConfigurationFromPluginOpts (pluginOpts) {
  const aliasMap = {
    a: 'writeAutoConfig',
    autoconfig: 'writeAutoConfig',
    c: 'config',
    o: 'configOverride',
    override: 'configOverride',
    p: 'includePrelude',
    prelude: 'includePrelude',
    pc: 'pruneConfig',
    pruneconfig: 'pruneConfig',
    d: 'debugMode',
    debug: 'debugMode',
    dc: 'writeAutoConfigDebug',
    debugconfig: 'writeAutoConfigDebug',
    pn: 'policyName',
    policyname: 'policyName',
    h: 'help'
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
    includePrelude: 'includePrelude' in pluginOpts ? Boolean(pluginOpts.includePrelude) : true,
    pruneConfig: Boolean(pluginOpts.pruneConfig),
    debugMode: Boolean(pluginOpts.debugMode),
    writeAutoConfig: Boolean(pluginOpts.writeAutoConfig || pluginOpts.writeAutoConfigDebug),
    writeAutoConfigDebug: Boolean(pluginOpts.writeAutoConfigDebug),
    actionOverrides: {}
  }

  // check for action overrides
  if (typeof pluginOpts.writeAutoConfig === 'function') {
    configuration.actionOverrides.writeAutoConfig = pluginOpts.writeAutoConfig
  }
  if (typeof pluginOpts.config === 'object') {
    const configFromPluginOpts = pluginOpts.config
    configuration.actionOverrides.loadPrimaryPolicy = () => configFromPluginOpts
    delete pluginOpts.config
  }

  // prepare policy paths
  configuration.policyPaths = getPolicyPaths(pluginOpts)

  return configuration
}

function writeAutoConfig (policy, configuration) {
  // check for action override
  if (configuration.actionOverrides.writeAutoConfig) {
    configuration.actionOverrides.writeAutoConfig(policy)
    return
  }
  // write policy-debug file
  if (configuration.writeAutoConfigDebug) {
    fs.mkdirSync(path.dirname(configuration.policyPaths.debug), { recursive: true })
    fs.writeFileSync(configuration.policyPaths.debug, jsonStringify(policy, { space: 2 }))
    console.warn(`LavaMoat wrote config debug to "${configuration.policyPaths.debug}"`)
    // clean up debugInfo
    delete policy.debugInfo
  }
  // if missing, write empty policy-override file
  const overrideConfigPath = configuration.policyPaths.override
  if (!fs.existsSync(overrideConfigPath)) {
    const basicConfig = { resources: {} }
    fs.mkdirSync(path.dirname(overrideConfigPath), { recursive: true })
    fs.writeFileSync(overrideConfigPath, jsonStringify(basicConfig, { space: 2 }))
    console.warn(`LavaMoat Override Config - wrote to "${overrideConfigPath}"`)
  }
  // write policy file
  const configPath = configuration.policyPaths.primary
  fs.mkdirSync(path.dirname(configPath), { recursive: true })
  fs.writeFileSync(configPath, jsonStringify(policy, { space: 2 }))
  console.warn(`LavaMoat Config - wrote to "${configPath}"`)
}

function loadPolicyFile ({ filepath, tolerateMissing }) {
  const exists = fs.existsSync(filepath)
  if (!exists) {
    if (tolerateMissing) {
      return { resources: {} }
    }
    throw new Error(`Lavamoat - Configuration file not found at path: '${filepath}', use --writeAutoConfig option to generate one`)
  }
  const content = fs.readFileSync(filepath, 'utf8')
  const policyFile = JSON.parse(content)
  return policyFile
}

function loadPolicy (configuration) {
  let primaryPolicy
  if (configuration.actionOverrides.loadPrimaryPolicy) {
    primaryPolicy = configuration.actionOverrides.loadPrimaryPolicy()
  } else {
    primaryPolicy = loadPolicyFile({
      filepath: configuration.policyPaths.primary,
      tolerateMissing: configuration.writeAutoConfig
    })
  }
  const overridePolicy = loadPolicyFile({
    filepath: configuration.policyPaths.override,
    tolerateMissing: true
  })
  // validate each policy
  validatePolicy(primaryPolicy)
  validatePolicy(overridePolicy)
  const finalPolicy = mergeConfig(primaryPolicy, overridePolicy)
  return finalPolicy
}

function getPolicyPaths (pluginOpts) {
  const defaultPaths = getDefaultPaths(pluginOpts.policyName)
  return {
    primary: path.resolve(pluginOpts.config || defaultPaths.primary),
    override: path.resolve(pluginOpts.configOverride || defaultPaths.override),
    debug: path.resolve(pluginOpts.configDebug || defaultPaths.debug)
  }
}

function createLavamoatPacker (configuration = {}) {
  const { includePrelude } = configuration
  const defaults = {
    raw: true,
    config: loadPolicy(configuration),
    prelude: includePrelude && generatePrelude(configuration)
  }
  const packOpts = Object.assign({}, defaults, configuration)
  const customPack = createCustomPack(packOpts)
  return customPack
}

function validatePolicy (policy) {
  if (typeof policy !== 'object') {
    throw new Error(`LavaMoat - Expected policy to be an object, got "${typeof policy}"`)
  }

  if (!Object.keys(policy).includes('resources')) {
    throw new Error('LavaMoat - Expected label \'resources\' for configuration key')
  }

  Object.entries(policy.resources).forEach(([packageName, packageOpts], index) => {
    const packageOptions = Object.keys(packageOpts)
    const packageEntries = Object.values(packageOpts)
    const optionsWhitelist = ['globals', 'packages']
    const valuesWhitelist = [true, 'write']

    if (!packageOptions.every(packageOpt => optionsWhitelist.includes(packageOpt))) {
      throw new Error('LavaMoat - Unrecognized package options. Expected \'globals\' or \'packages\'')
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
