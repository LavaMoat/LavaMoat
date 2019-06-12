const through = require('through2')
const packageNameFromPath = require('module-name-from-path')
const flatMap = require('lodash.flatmap')
const pathSeperator = require('path').sep
const fromEntries = require('fromentries')

const inspectGlobals = require('./inspectGlobals')

module.exports = { createConfigSpy, calculateDepPaths }

const rootSlug = '<root>'
const ignoredGlobals = [
  // we point this at the global manually
  'self',
  // this is handled by SES
  'eval'
]

// createConfigSpy creates a pass-through object stream for the Browserify pipeline.
// it analyses modules for global namespace usages, and generates a config for Sesify.
// it calls `onResult` with the config when the stream ends.

function createConfigSpy ({ onResult }) {
  const packageToGlobals = {}
  const packageToModules = {}

  const configSpy = createSpy(inspectModule, onBuildEnd)
  return configSpy

  function inspectModule (module) {
    const packageName = packageNameFromModule(module)
    // initialize mapping from package to module
    const packageModules = packageToModules[packageName] = packageToModules[packageName] || {}
    packageModules[module.id] = module
    // skip for project files (files not from deps)
    const isDependency = packageName === rootSlug
    if (isDependency) return
    // gather config info
    const foundGlobals = inspectGlobals(module.source, packageName)
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

  function onBuildEnd () {
    // generate the final config
    const config = generateConfig({ packageToGlobals, packageToModules })
    // report result
    onResult(config)
  }
}

function aggregateDeps (packageModules) {
  const deps = new Set()
  Object.values(packageModules).forEach((module) => {
    const newDeps = Object.values(module.deps)
      .filter(Boolean)
      .map(packageNameFromModuleId)
    newDeps.forEach(dep => deps.add(dep))
  })
  const depsArray = Array.from(deps.values())
  return depsArray
}

function generateConfig ({ packageToGlobals, packageToModules }) {
  const resources = {}
  const config = { resources }
  Object.entries(packageToModules).forEach(([packageName, packageModules]) => {
    let globals, modules
    // get dependencies
    const packageDeps = aggregateDeps(packageModules)
    if (packageDeps.length) {
      modules = fromEntries(packageDeps.map(dep => [dep, true]))
    }
    // get globals
    if (packageToGlobals[packageName]) {
      const detectedGlobals = Array.from(packageToGlobals[packageName].values())
      globals = fromEntries(detectedGlobals.map(globalPath => [globalPath, true]))
    }
    // set config for package
    resources[packageName] = { modules, globals }
  })

  return JSON.stringify(config, null, 2)
}

function calculateDepPaths (packageName, reverseDepGraph, partialPath) {
  // only present in recursion
  if (!partialPath) partialPath = [packageName]
  // fans out into each new possibility
  const nextDeps = reverseDepGraph[packageName]
  if (!nextDeps) return [partialPath]
  const current = Array.from(nextDeps).map(dep => {
    return [dep].concat(partialPath)
  })
  // recurse and flatten
  return flatMap(current, partial => {
    const next = partial[0]
    return calculateDepPaths(next, reverseDepGraph, partial)
  })
}

function packageNameFromModule (module) {
  // get package name from module.id full path
  return packageNameFromModuleId(module.id)
}

function packageNameFromModuleId (moduleId) {
  // "moduleId" must be full fs path for this to work
  let packageName = packageNameFromPath(moduleId)
  if (packageName) return packageName
  // detect if files are part of the entry and not from dependencies
  const filePathFirstPart = moduleId.split(pathSeperator)[0]
  const isAppLevel = ['.', '..', ''].includes(filePathFirstPart)
  if (isAppLevel) return rootSlug
  // otherwise fail
  throw new Error(`Sesify - Config Autogen - Failed to parse module name. first part: "${filePathFirstPart}"`)
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
