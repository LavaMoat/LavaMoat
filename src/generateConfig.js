const through = require('through2')
const fromEntries = require('fromentries')
const jsonStringify = require('json-stable-stringify')
const acornGlobals = require('acorn-globals')

const inspectGlobals = require('./inspectGlobals')
const { inspectEnvironment, environmentTypes, environmentTypeStrings } = require('./inspectEnvironment')

const rootSlug = '<root>'
const defaultEnvironment = environmentTypes.frozen

module.exports = { rootSlug, createConfigSpy }

const ignoredGlobals = [
  // we point at these manually
  'self',
  'window',
  // this is handled by SES
  'eval'
]

// createConfigSpy creates a pass-through object stream for the Browserify pipeline.
// it analyses modules for global namespace usages, and generates a config for Sesify.
// it calls `onResult` with the config when the stream ends.

function createConfigSpy ({ onResult }) {
  const packageToEnvironments = {}
  const packageToGlobals = {}
  const packageToModules = {}
  const moduleIdToPackageName = {}

  const configSpy = createSpy(inspectModule, onBuildEnd)
  return configSpy

  function inspectModule (module) {
    const packageName = module.package
    moduleIdToPackageName[module.id] = packageName
    // initialize mapping from package to module
    const packageModules = packageToModules[packageName] = packageToModules[packageName] || {}
    packageModules[module.id] = module
    // skip for project files (files not from deps)
    const isDependency = packageName === rootSlug
    if (isDependency) return
    // gather config info
    const ast = acornGlobals.parse(module.source)
    // get global usage
    inspectForGlobals(ast, packageName)
    // get eval environment
    inspectForEnvironment(ast, packageName)
  }

  function inspectForEnvironment (ast, packageName) {
    const result = inspectEnvironment(ast, packageName)
    // initialize results for package
    const environments = packageToEnvironments[packageName] = packageToEnvironments[packageName] || []
    environments.push(result)
  }

  function inspectForGlobals (ast, packageName) {
    const foundGlobals = inspectGlobals(ast, packageName)
    const globalNames = foundGlobals.filter(name => !ignoredGlobals.includes(name))
    // skip if no results
    if (!globalNames.length) return
    // add globals to map
    const packageGlobals = packageToGlobals[packageName]
    if (packageGlobals) {
      globalNames.forEach(glob => packageGlobals.add(glob))
    } else {
      packageToGlobals[packageName] = new Set(globalNames)
    }
  }

  function generateConfig () {
    const resources = {}
    const config = { resources }
    Object.entries(packageToModules).forEach(([packageName, packageModules]) => {
      let globals, modules, environment
      // get dependencies
      const packageDeps = aggregateDeps({ packageModules, moduleIdToPackageName })
      if (packageDeps.length) {
        modules = fromEntries(packageDeps.map(dep => [dep, true]))
      }
      // get globals
      if (packageToGlobals[packageName]) {
        const detectedGlobals = Array.from(packageToGlobals[packageName].values())
        globals = fromEntries(detectedGlobals.map(globalPath => [globalPath, true]))
      }
      // get environment
      const environments = packageToEnvironments[packageName]
      if (environments) {
        const bestEnvironment = environments.sort()[environments.length-1]
        const isDefault = bestEnvironment === defaultEnvironment
        environment = isDefault ? undefined : environmentTypeStrings[bestEnvironment]
      }
      // skip package config if there are no settings needed
      if (!modules && !globals && !environment) return
      // set config for package
      resources[packageName] = { modules, globals, environment }
    })

    return jsonStringify(config, { space: 2 })
  }

  function onBuildEnd () {
    // generate the final config
    const config = generateConfig()
    // report result
    onResult(config)
  }
}

function aggregateDeps ({ packageModules, moduleIdToPackageName }) {
  const deps = new Set()
  Object.values(packageModules).forEach((module) => {
    const newDeps = Object.values(module.deps)
      .filter(Boolean)
      .map(id => moduleIdToPackageName[id])
    newDeps.forEach(dep => deps.add(dep))
    // ensure the package is not listed as its own dependency
    deps.delete(module.package)
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
    // end normally
    cb()
  })
}
