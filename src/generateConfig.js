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

function createConfigSpy ({ onResult }) {
  const globalMap = {}
  const moduleDepGraph = {}
  const reverseDepGraph = {}
  const packageToModules = {}

  const configSpy = through.obj((module, _, cb) => {
    // gather config info
    inspectModule(module)
    // pass module through normally
    cb(null, module)
  }, onEnd)
  return configSpy

  function inspectModule (module) {
    const packageName = packageNameFromModule(module)
    // initialize mapping from package to module
    const packageModules = packageToModules[packageName] = packageToModules[packageName] || {}
    packageModules[module.id] = module
    // add to dep graph
    updatePackageDeps(packageName, module.deps)
    // skip for project files (files not from deps)
    const isDependency = packageName === rootSlug
    if (isDependency) return
    // gather config info
    const foundGlobals = inspectGlobals(module.source, packageName)
    const globalNames = foundGlobals.filter(name => !ignoredGlobals.includes(name))
    // skip if no results
    if (!globalNames.length) return
    // add globals to map
    const moduleGlobals = globalMap[packageName]
    if (moduleGlobals) {
      globalNames.forEach(glob => moduleGlobals.add(glob))
    } else {
      globalMap[packageName] = new Set(globalNames)
    }
  }

  function onEnd (cb) {
    const config = generateConfig2({ globalMap, moduleDepGraph, reverseDepGraph, packageToModules })
    onResult(config)
    cb()
  }

  function updatePackageDeps (packageName, fileDeps) {
    // // normal dep graph
    // const deps = moduleDepGraph[packageName] || []
    // const mergedDeps = Object.values(fileDeps).map(packageNameFromPath).concat(deps)
    // const uniqueResult = Array.from(new Set(mergedDeps))
    // moduleDepGraph[packageName] = uniqueResult
    // reverse dep graph

    // get unique dependency paths (dep paths are false when skipped)
    const depFullPaths = unique(Object.values(fileDeps).filter(Boolean))
    // get unique dependency modules
    const newDeps = unique(depFullPaths.map(packageNameFromPath))
    newDeps.forEach(depName => {
      // entry point
      if (!depName) return
      // intermodule require
      if (depName === packageName) return
      // add dependant to revDepGraph
      let revDeps = reverseDepGraph[depName]
      if (!revDeps) {
        revDeps = new Set()
        reverseDepGraph[depName] = revDeps
      }
      revDeps.add(packageName)
    })
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

function generateConfig2 ({ globalMap, moduleDepGraph, reverseDepGraph, packageToModules }) {
  // package -> deps
  // package -> globals
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
    if (globalMap[packageName]) {
      const detectedGlobals = Array.from(globalMap[packageName].values())
      globals = fromEntries(detectedGlobals.map(globalPath => [globalPath, true]))
    }
    // set config for package
    resources[packageName] = { modules, globals }
  })

  return JSON.stringify(config, null, 2)
}

function generateConfig ({ globalMap, moduleDepGraph, reverseDepGraph, packageToModules }) {
  const defaultGlobals = [
    // safe
    'console',
    'atob',
    'btoa',
    // frequently used
    'setTimeout',
    'clearTimeout',
    'clearInterval',
    'setInterval'
  ]
  let moduleGlobalContent = []
  let depGraphContent = []
  Object.keys(globalMap).map(packageName => {
    const moduleGlobals = globalMap[packageName]
    if (!moduleGlobals) return
    const globalNames = Array.from(moduleGlobals.values()).filter(glob => !defaultGlobals.includes(glob))
    if (!globalNames.length) return
    // generate code for module globals config
    const globalsList = serializeStringArray(globalNames)
    moduleGlobalContent.push(`exposeToModule('${packageName}', ${globalsList})`)
    // generate code for putting config in dep graph
    const depPaths = calculateDepPaths(packageName, reverseDepGraph)
    const depPathSlugs = depPaths.map(pathParts => pathParts.slice(1).join(' '))
    const depLines = depPathSlugs.map(pathSlug => `exposeToDep('${packageName}', '${pathSlug}')`)
    depGraphContent = depGraphContent.concat(depLines)
  })

  return (`
// these are used for global detection by some modules
const safeObjects = sesEval('({ Object, Symbol })')

const defaultGlobals = Object.assign({}, getAndBindGlobals(${serializeStringArray(defaultGlobals)}), safeObjects)
const moduleGlobals = {}
const depConfig = {}

function getAndBindGlobals (globalNames) {
  const selectedGlobals = {}
  globalNames.forEach(glob => {
    const value = deepGetAndBind(self, glob)
    if (value === undefined) return
    deepSet(selectedGlobals, glob, value)
  })
  return selectedGlobals
}

function deepGetAndBind(obj, pathName) {
  const pathParts = pathName.split('.')
  const parentPath = pathParts.slice(0,-1).join('.')
  const childKey = pathParts[pathParts.length-1]
  const globalRef = typeof self !== 'undefined' ? self : global
  const parent = parentPath ? deepGet(globalRef, parentPath) : globalRef
  if (!parent) return parent
  const value = parent[childKey]
  if (typeof value === 'function') {
    return value.bind(parent)
  }
  return value
}

function deepGet (obj, pathName) {
  let result = obj
  pathName.split('.').forEach(pathPart => {
    if (result === null) {
      result = undefined
      return
    }
    if (result === undefined) {
      return
    }
    result = result[pathPart]
  })
  return result
}

function deepSet (obj, pathName, value) {
  let parent = obj
  const pathParts = pathName.split('.')
  const lastPathPart = pathParts[pathParts.length-1]
  pathParts.slice(0,-1).forEach(pathPart => {
    const prevParent = parent
    parent = parent[pathPart]
    if (parent === null) {
      throw new Error('DeepSet - unable to set "'+pathName+'" on null')
    }
    if (parent === undefined) {
      parent = {}
      prevParent[pathPart] = parent
    }
  })
  parent[lastPathPart] = value
}

function exposeToModule (packageName, globalNames) {
  const globalsToExpose = getAndBindGlobals(globalNames)
  moduleGlobals[packageName] = Object.assign({}, defaultGlobals, globalsToExpose)
}

function exposeToDep (packageName, depPath) {
  depConfig[depPath] = { $: moduleGlobals[packageName] }
}

// set per-module globals config
${moduleGlobalContent.join('\n')}
// set in dep graph
// depGraph goes here
${depGraphContent.join('\n')}

const config = {
  dependencies: depConfig,
  global: {},
  defaultGlobals,
}

return config`)
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

function serializeStringArray (array) {
  return '[' + array.map(entry => `'${entry}'`).join(', ') + ']'
}

function unique (arr) {
  return Array.from(new Set(arr))
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
