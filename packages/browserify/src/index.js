const fs = require('fs')
const path = require('path')
const { getDefaultPaths } = require('lavamoat-core')
const jsonStringify = require('json-stable-stringify')
const { createModuleInspectorSpy } = require('./createModuleInspectorSpy.js')
const { createPackageDataStream } = require('./createPackageDataStream.js')
const createLavaPack = require('@lavamoat/lavapack')
const { createSesWorkaroundsTransform } = require('./sesTransforms')
const { loadCanonicalNameMap } = require('@lavamoat/aa')
const browserResolve = require('browser-resolve')

// these are the reccomended arguments for lavaMoat to work well with browserify
const reccomendedArgs = {
  // this option helps with parsing global usage
  insertGlobalVars: {
    global: false,
  },
  // this option prevents creating unnecesary psuedo-dependencies
  // where packages appear to rely on other packages because they
  // are using each other for code deduplication
  // this also breaks bify-package-factor and related tools
  dedupe: false,
}

// primary export is the Browserify plugin
module.exports = plugin
module.exports.createLavamoatPacker = createLavamoatPacker
module.exports.loadPolicy = loadPolicyFromPluginOpts
module.exports.args = reccomendedArgs

function plugin(browserify, pluginOpts) {
  // pluginOpts.policy is policy path
  const configuration = getConfigurationFromPluginOpts(pluginOpts)

  // setup the plugin in a re-bundle friendly way
  browserify.on('reset', setupPlugin)
  setupPlugin()

  function setupPlugin() {
    let canonicalNameMap
    async function getCanonicalNameMap() {
      // load canonical name map on first request
      if (canonicalNameMap === undefined) {
        canonicalNameMap = await loadCanonicalNameMap({
          rootDir: configuration.projectRoot,
          // need this in order to walk browser builtin deps
          includeDevDeps: true,
          resolve: browserResolve,
        })
      }
      return canonicalNameMap
    }

    // some workarounds for SES strict parsing and evaluation
    browserify.transform(createSesWorkaroundsTransform(), { global: true })

    // inject package name into module data
    browserify.pipeline.get('emit-deps').unshift(
      createPackageDataStream({
        getCanonicalNameMap,
      })
    )

    // if writeAutoPolicy activated, insert hook
    if (configuration.writeAutoPolicy) {
      const policyOverride = loadPolicyFile({
        filepath: configuration.policyPaths.override,
        tolerateMissing: true,
      })
      validatePolicy(policyOverride)
      browserify.pipeline.get('emit-deps').push(
        createModuleInspectorSpy({
          policyOverride,
          // no builtins in the browser (yet!)
          isBuiltin: () => false,
          // should prepare debug info
          includeDebugInfo: configuration.writeAutoPolicyDebug,
          // write policy files to disk
          onResult: (policy) => writeAutoPolicy(policy, configuration),
        })
      )
    } else {
      // when not generating policy files, announce policy files as build deps for watchify
      // ref https://github.com/browserify/watchify#working-with-browserify-transforms
      const primary = path.resolve(
        configuration.projectRoot,
        configuration.policyPaths.primary
      )
      const override = path.resolve(
        configuration.projectRoot,
        configuration.policyPaths.override
      )
      // wait until next tick to ensure file event subscribers have run
      setTimeout(() => {
        browserify.emit('file', primary)
        browserify.emit('file', override)
      })
    }

    // replace the standard browser-pack with our custom packer
    browserify.pipeline
      .get('pack')
      .splice(0, 1, createLavamoatPacker(configuration))
  }
}

function loadPolicyFromPluginOpts(pluginOpts = {}) {
  const configuration = getConfigurationFromPluginOpts(pluginOpts)
  return loadPolicy(configuration)
}

function getConfigurationFromPluginOpts(pluginOpts) {
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
    stats: 'statsMode',
    pn: 'policyName',
    r: 'projectRoot',
  }

  const nonAliasedOptions = [
    'scuttleGlobalThis',
    'scuttleGlobalThisExceptions',
    'bundleWithPrecompiledModules',
    'policyDebug',
    'projectRoot',
  ]

  const allowedKeys = new Set([
    ...nonAliasedOptions,
    ...Object.keys(aliasMap),
    ...Object.values(aliasMap),
    '_', // Browserify adds this as the first option when running from the command line
  ])
  const invalidKeys = Reflect.ownKeys(pluginOpts).filter(
    (key) => !allowedKeys.has(key)
  )
  if (invalidKeys.length) {
    throw new Error(`Lavamoat - Unrecognized options provided '${invalidKeys}'`)
  }

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

  if (pluginOpts.scuttleGlobalThisExceptions) {
    console.warn(
      'Lavamoat - "scuttleGlobalThisExceptions" is deprecated. Use "scuttleGlobalThis.exceptions" instead.'
    )
    if (pluginOpts.scuttleGlobalThis === true) {
      pluginOpts.scuttleGlobalThis = { enabled: true }
    }
    pluginOpts.scuttleGlobalThis.exceptions =
      pluginOpts.scuttleGlobalThis?.exceptions ||
      pluginOpts.scuttleGlobalThisExceptions
  }

  const configuration = {
    projectRoot: pluginOpts.projectRoot,
    includePrelude:
      'includePrelude' in pluginOpts
        ? Boolean(pluginOpts.includePrelude)
        : true,
    pruneConfig: Boolean(pluginOpts.prunePolicy),
    debugMode: Boolean(pluginOpts.debugMode),
    statsMode: Boolean(pluginOpts.statsMode),
    scuttleGlobalThis: pluginOpts.scuttleGlobalThis,
    writeAutoPolicy: Boolean(
      pluginOpts.writeAutoPolicy || pluginOpts.writeAutoPolicyDebug
    ),
    writeAutoPolicyDebug: Boolean(pluginOpts.writeAutoPolicyDebug),
    bundleWithPrecompiledModules:
      'bundleWithPrecompiledModules' in pluginOpts
        ? Boolean(pluginOpts.bundleWithPrecompiledModules)
        : true,
    actionOverrides: {},
  }

  // check for action overrides
  if (typeof pluginOpts.writeAutoPolicy === 'function') {
    configuration.actionOverrides.writeAutoPolicy = pluginOpts.writeAutoPolicy
  }
  if (typeof pluginOpts.policy === 'object') {
    const policyFromPluginOpts = pluginOpts.policy
    configuration.actionOverrides.loadPrimaryPolicy = () => policyFromPluginOpts
    delete pluginOpts.policy
  }

  // prepare policy paths
  configuration.policyPaths = getPolicyPaths(pluginOpts)

  return configuration
}

function writeAutoPolicy(policy, configuration) {
  // check for action override
  if (configuration.actionOverrides.writeAutoPolicy) {
    configuration.actionOverrides.writeAutoPolicy(policy)
    return
  }
  // write policy-debug file
  if (configuration.writeAutoPolicyDebug) {
    fs.mkdirSync(path.dirname(configuration.policyPaths.debug), {
      recursive: true,
    })
    fs.writeFileSync(
      configuration.policyPaths.debug,
      jsonStringify(policy, { space: 2 })
    )
    console.warn(
      `LavaMoat wrote policy debug to "${configuration.policyPaths.debug}"`
    )
    // clean up debugInfo
    delete policy.debugInfo
  }
  // if missing, write empty policy-override file
  const policyOverridePath = configuration.policyPaths.override
  if (!fs.existsSync(policyOverridePath)) {
    const basicPolicy = { resources: {} }
    fs.mkdirSync(path.dirname(policyOverridePath), { recursive: true })
    fs.writeFileSync(
      policyOverridePath,
      jsonStringify(basicPolicy, { space: 2 })
    )
    console.warn(`LavaMoat Override Policy - wrote to "${policyOverridePath}"`)
  }
  // write policy file
  const policyPath = configuration.policyPaths.primary
  fs.mkdirSync(path.dirname(policyPath), { recursive: true })
  fs.writeFileSync(policyPath, jsonStringify(policy, { space: 2 }))
  console.warn(`LavaMoat Policy - wrote to "${policyPath}"`)
}

function loadPolicyFile({ filepath, tolerateMissing }) {
  const exists = fs.existsSync(filepath)
  if (!exists) {
    if (tolerateMissing) {
      return { resources: {} }
    }
    throw new Error(
      `Lavamoat - Policy file not found at path: '${filepath}', use --writeAutoPolicy option to generate one`
    )
  }
  const content = fs.readFileSync(filepath, 'utf8')
  const policyFile = JSON.parse(content)
  return policyFile
}

// TODO: dedupe. lavamoat-core has a "loadPolicy" method but its async
function loadPolicy(configuration) {
  let policy
  if (configuration.actionOverrides.loadPrimaryPolicy) {
    policy = configuration.actionOverrides.loadPrimaryPolicy()
  } else {
    policy = loadPolicyFile({
      filepath: configuration.policyPaths.primary,
      tolerateMissing: configuration.writeAutoPolicy,
    })
  }
  validatePolicy(policy)
  return policy
}

function getPolicyPaths(pluginOpts) {
  const { projectRoot, policy, policyOverride, policyDebug, policyName } =
    pluginOpts
  const defaultPaths = getDefaultPaths(policyName)
  const { primary, override, debug } = defaultPaths
  return {
    primary: policy || path.resolve(projectRoot, primary),
    override: policyOverride || path.resolve(projectRoot, override),
    debug: policyDebug || path.resolve(projectRoot, debug),
  }
}

function createLavamoatPacker(configuration = {}) {
  const defaults = {
    raw: true,
    policy: loadPolicy(configuration),
  }
  const packOpts = Object.assign({}, defaults, configuration)
  const customPack = createLavaPack(packOpts)
  return customPack
}

function validatePolicy(policy) {
  if (typeof policy !== 'object') {
    throw new Error(
      `LavaMoat - Expected policy to be an object, got "${typeof policy}"`
    )
  }

  if (!Object.keys(policy).includes('resources')) {
    throw new Error(
      "LavaMoat - Expected label 'resources' for configuration key"
    )
  }

  Object.entries(policy.resources).forEach(([, packageOpts]) => {
    const packageOptions = Object.keys(packageOpts)
    const packageEntries = Object.values(packageOpts)
    const optionsWhitelist = ['globals', 'packages']
    const valuesWhitelist = [true, 'write']

    const unrecognizedOptions = packageOptions.filter(
      (packageOpt) => !optionsWhitelist.includes(packageOpt)
    )
    if (unrecognizedOptions.length) {
      throw new Error(
        `LavaMoat - Unrecognized package option(s): ${JSON.stringify(unrecognizedOptions)}. Expected any of: ${JSON.stringify(optionsWhitelist)}`
      )
    }

    packageEntries.forEach((entry) => {
      const unrecognizedValues = Object.entries(entry).filter(
        ([, value]) => !valuesWhitelist.includes(value)
      )
      if (unrecognizedValues.length) {
        throw new Error(
          `LavaMoat - Unrecognized endowment value(s) for: ${JSON.stringify(unrecognizedValues.map(([key]) => key))}. Expected any of: ${JSON.stringify(valuesWhitelist)}`
        )
      }
    })
  })
}
