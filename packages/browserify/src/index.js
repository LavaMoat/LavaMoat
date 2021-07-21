const fs = require('fs')
const path = require('path')
const { generatePrelude, getDefaultPaths, mergePolicy } = require('lavamoat-core')
const jsonStringify = require('json-stable-stringify')
const createCustomPack = require('./createCustomPack')
const { createSesWorkaroundsTransform } = require('./sesTransforms')
const { applyModuleInspector } = require('./applyModuleInspector.js')
const { applyPackageData } = require('./applyPackageData.js')

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
module.exports.loadPolicy = loadPolicyFromPluginOpts
module.exports.applyModuleInspector = applyModuleInspector
module.exports.applyPackageData = applyPackageData
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
    applyPackageData(browserify)

    // if writeAutoPolicy activated, insert hook
    if (configuration.writeAutoPolicy) {
      applyModuleInspector(browserify, {
        includeDebugInfo: configuration.writeAutoPolicyDebug,
        onResult: (policy) => writeAutoPolicy(policy, configuration)
      })
    }

    // replace the standard browser-pack with our custom packer
    browserify.pipeline.get('pack').splice(0, 1, createLavamoatPacker(configuration))
  }
}

function loadPolicyFromPluginOpts (pluginOpts = {}) {
  const configuration = getConfigurationFromPluginOpts(pluginOpts)
  return loadPolicy(configuration)
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
    pn: 'policyName',
    projectRoot: 'projectRoot',
    r: 'projectRoot'
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

  if (!pluginOpts.projectRoot) {
    pluginOpts.projectRoot = process.cwd()
  }

  const configuration = {
    includePrelude: 'includePrelude' in pluginOpts ? Boolean(pluginOpts.includePrelude) : true,
    pruneConfig: Boolean(pluginOpts.prunePolicy),
    debugMode: Boolean(pluginOpts.debugMode),
    writeAutoPolicy: Boolean(pluginOpts.writeAutoPolicy || pluginOpts.writeAutoPolicyDebug),
    writeAutoPolicyDebug: Boolean(pluginOpts.writeAutoPolicyDebug),
    actionOverrides: {}
  }

  // check for action overrides
  if (typeof pluginOpts.writeAutoPolicy === 'function') {
    configuration.actionOverrides.writeAutoPolicy = pluginOpts.writeAutoPolicy
  }
  if (typeof pluginOpts.policy === 'object') {
    const configFromPluginOpts = pluginOpts.policy
    configuration.actionOverrides.loadPrimaryPolicy = () => configFromPluginOpts
    delete pluginOpts.policy
  }

  // prepare policy paths
  configuration.policyPaths = getPolicyPaths(pluginOpts)

  return configuration
}

function writeAutoPolicy (policy, configuration) {
  // check for action override
  if (configuration.actionOverrides.writeAutoPolicy) {
    configuration.actionOverrides.writeAutoPolicy(policy)
    return
  }
  // write policy-debug file
  if (configuration.writeAutoPolicyDebug) {
    fs.mkdirSync(path.dirname(configuration.policyPaths.debug), { recursive: true })
    fs.writeFileSync(configuration.policyPaths.debug, jsonStringify(policy, { space: 2 }))
    console.warn(`LavaMoat wrote policy debug to "${configuration.policyPaths.debug}"`)
    // clean up debugInfo
    delete policy.debugInfo
  }
  // if missing, write empty policy-override file
  const policyOverridePath = configuration.policyPaths.override
  if (!fs.existsSync(policyOverridePath)) {
    const basicPolicy = { resources: {} }
    fs.mkdirSync(path.dirname(policyOverridePath), { recursive: true })
    fs.writeFileSync(policyOverridePath, jsonStringify(basicPolicy, { space: 2 }))
    console.warn(`LavaMoat Override Policy - wrote to "${policyOverridePath}"`)
  }
  // write policy file
  const policyPath = configuration.policyPaths.primary
  fs.mkdirSync(path.dirname(policyPath), { recursive: true })
  fs.writeFileSync(policyPath, jsonStringify(policy, { space: 2 }))
  console.warn(`LavaMoat Policy - wrote to "${policyPath}"`)
}

function loadPolicyFile ({ filepath, tolerateMissing }) {
  const exists = fs.existsSync(filepath)
  if (!exists) {
    if (tolerateMissing) {
      return { resources: {} }
    }
    throw new Error(`Lavamoat - Policy file not found at path: '${filepath}', use --writeAutoPolicy option to generate one`)
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
      tolerateMissing: configuration.writeAutoPolicy
    })
  }
  const overridePolicy = loadPolicyFile({
    filepath: configuration.policyPaths.override,
    tolerateMissing: true
  })
  // validate each policy
  validatePolicy(primaryPolicy)
  validatePolicy(overridePolicy)
  const finalPolicy = mergePolicy(primaryPolicy, overridePolicy)
  return finalPolicy
}

function getPolicyPaths (pluginOpts) {
  const { projectRoot, policy, policyOverride, configDebug, policyName } = pluginOpts
  const defaultPaths = getDefaultPaths(policyName)
  const { primary, override, debug } = defaultPaths
  return {
    primary: policy || path.resolve(projectRoot, primary),
    override: policyOverride || path.resolve(projectRoot, override),
    debug: configDebug || path.resolve(projectRoot, debug)
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
