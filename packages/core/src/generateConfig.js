const through = require('through2')
const fromEntries = require('fromentries')
const jsonStringify = require('json-stable-stringify')
const acornGlobals = require('acorn-globals')
const { inspectGlobals, utils: { mergeConfig, mapToObj } } = require('lavamoat-tofu')
const { inspectEnvironment, environmentTypes, environmentTypeStrings } = require('./inspectEnvironment')
const defaultEnvironment = environmentTypes.frozen
const rootSlug = '<root>'

module.exports = { rootSlug, createConfigSpy, createModuleInspector }

// createConfigSpy creates a pass-through object stream for the Browserify pipeline.
// it analyses modules for global namespace usages, and generates a config for LavaMoat.
// it calls `onResult` with the config when the stream ends.

function createConfigSpy ({ onResult }) {
  const inspector = createModuleInspector()
  const configSpy = createSpy(
    // inspect each module
    inspector.inspectModule,
    // after all modules, submit config
    () => onResult(inspector.generateConfig())
  )
  return configSpy
}

function createModuleInspector () {
  const packageToEnvironments = {}
  const packageToGlobals = {}
  const packageToModules = {}
  const moduleIdToPackageName = {}

  return {
    inspectModule,
    generateConfig
  }

  function inspectModule (moduleData) {
    const packageName = moduleData.package
    moduleIdToPackageName[moduleData.id] = packageName
    // initialize mapping from package to module
    const packageModules = packageToModules[packageName] = packageToModules[packageName] || {}
    packageModules[moduleData.id] = moduleData
    // skip for root modules (modules not from deps)
    const isRootModule = packageName === rootSlug
    if (isRootModule) return
    // skip json files
    const filename = moduleData.file || 'unknown'
    const fileExtension = filename.split('.').pop()
    if (fileExtension === 'json') return
    // get eval environment
    const ast = acornGlobals.parse(moduleData.source)
    inspectForEnvironment(ast, packageName)
    // get global usage
    inspectForGlobals(moduleData, packageName)
  }

  function inspectForEnvironment (ast, packageName) {
    const result = inspectEnvironment(ast, packageName)
    // initialize results for package
    const environments = packageToEnvironments[packageName] = packageToEnvironments[packageName] || []
    environments.push(result)
  }

  function inspectForGlobals (moduleData, packageName) {
    const { source } = moduleData
    const foundGlobals = inspectGlobals(source, {
      // browserify commonjs scope
      ignoredRefs: ['require', 'module', 'exports', 'arguments'],
      // browser global refs + browserify global
      globalRefs: ['globalThis', 'self', 'window', 'global']
    })
    // add globalUsage info
    moduleData.globalUsage = mapToObj(foundGlobals)
    // skip if no results
    if (!foundGlobals.size) return
    const packageGlobals = packageToGlobals[packageName]
    if (packageGlobals) {
      // merge maps
      packageToGlobals[packageName] = mergeConfig(packageGlobals, foundGlobals)
    } else {
      // new map
      packageToGlobals[packageName] = foundGlobals
    }
  }

  function generateConfig () {
    const resources = {}
    const config = { resources }
    Object.entries(packageToModules).forEach(([packageName, packageModules]) => {
      let globals, packages, environment
      // skip for root modules (modules not from deps)
      const isRootModule = packageName === rootSlug
      if (isRootModule) return
      // get dependencies
      const packageDeps = aggregateDeps({ packageModules, moduleIdToPackageName })
      if (packageDeps.length) {
        packages = fromEntries(packageDeps.map(dep => [dep, true]))
      }
      // get globals
      if (packageToGlobals[packageName]) {
        globals = mapToObj(packageToGlobals[packageName])
        // prefer "true" over "read" for clearer difference between
        // read/write syntax highlighting
        Object.keys(globals).forEach(key => {
          if (globals[key] === 'read') globals[key] = true
        })
      }
      // get environment
      const environments = packageToEnvironments[packageName]
      if (environments) {
        const bestEnvironment = environments.sort()[environments.length - 1]
        const isDefault = bestEnvironment === defaultEnvironment
        environment = isDefault ? undefined : environmentTypeStrings[bestEnvironment]
      }
      // skip package config if there are no settings needed
      if (!packages && !globals && !environment) return
      // set config for package
      resources[packageName] = { packages, globals, environment }
    })

    return jsonStringify(config, { space: 2 })
  }
}

function aggregateDeps ({ packageModules, moduleIdToPackageName }) {
  const deps = new Set()
  Object.values(packageModules).forEach((moduleData) => {
    const newDeps = Object.values(moduleData.deps)
      .filter(Boolean)
      .map(id => moduleIdToPackageName[id])
    newDeps.forEach(dep => deps.add(dep))
    // ensure the package is not listed as its own dependency
    deps.delete(moduleData.package)
  })
  const depsArray = Array.from(deps.values())
  return depsArray
}

function createSpy (onData, onEnd) {
  return through.obj((data, _, cb) => {
    // give data to observer fn
    onData(data)
    // pass the data through normally
    cb(null, data)
  }, (cb) => {
    // call flush observer
    onEnd()
    // End as normal
    cb()
  })
}
