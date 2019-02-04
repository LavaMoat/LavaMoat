const through = require('through2')
const moduleNameFromPath = require('module-name-from-path')
const flatMap = require('lodash.flatmap')
const inspectGlobals = require('./inspectGlobals')
const pathSeperator = require('path').sep

module.exports = { createConfigSpy, calculateDepPaths }

const rootSlug = '<root>'
const ignoredGlobals = [
  // we point this at the global manually
  'self',
  // this is handled by SES
  'eval',
]

function createConfigSpy ({ onResult }) {
  const globalMap = {}
  const moduleDepGraph = {}
  const reverseDepGraph = {}

  const configSpy = through.obj((dep, _, cb) => {
    // gather config info
    inspectDependency(dep)
    // pass dep through normally
    cb(null, dep)
  }, onEnd)
  return configSpy

  function inspectDependency (dep) {
    // "dep.id" must be full fs path for this to work
    const filePathFirstPart = dep.id.split(pathSeperator)[0]
    const moduleName = moduleNameFromPath(dep.id)
    if (!moduleName && !['.','..',''].includes(filePathFirstPart)) {
      throw new Error(`Sesify - Config Autogen - Failed to parse module name. first part: "${filePathFirstPart}"`)
    }
    // moduleName is falsy for project files not from dependencies
    const isDependency = !!moduleName
    updateModuleDeps(isDependency ? moduleName : rootSlug, dep.deps)
    // skip for project files (files not from deps)
    if (!isDependency) return
    // gather config info
    const foundGlobals = inspectGlobals(dep.source, moduleName)
    const globalNames = foundGlobals.filter(name => !ignoredGlobals.includes(name))
    // skip if no results
    if (!globalNames.length) return
    // add globals to map
    const moduleGlobal = globalMap[moduleName]
    if (moduleGlobal) {
      globalNames.forEach(glob => moduleGlobal.add(glob))
    } else {
      globalMap[moduleName] = new Set(globalNames)
    }
  }

  function onEnd (cb) {
    const config = generateConfig(globalMap, moduleDepGraph, reverseDepGraph)
    onResult(config)
    cb()
  }

  function updateModuleDeps(moduleName, fileDeps) {
    // // normal dep graph
    // const deps = moduleDepGraph[moduleName] || []
    // const mergedDeps = Object.values(fileDeps).map(moduleNameFromPath).concat(deps)
    // const uniqueResult = Array.from(new Set(mergedDeps))
    // moduleDepGraph[moduleName] = uniqueResult
    // reverse dep graph
    
    // get unique dependency paths (dep paths are false when skipped)
    const depFullPaths = unique(Object.values(fileDeps).filter(Boolean))
    // get unique dependency modules
    const newDeps = unique(depFullPaths.map(moduleNameFromPath))
    newDeps.forEach(depName => {
      // entry point
      if (!depName) return
      // intermodule require
      if (depName === moduleName) return
      // add dependant to revDepGraph
      let revDeps = reverseDepGraph[depName]
      if (!revDeps) {
        revDeps = new Set()
        reverseDepGraph[depName] = revDeps
      }
      revDeps.add(moduleName)
    })
  }
}

function generateConfig (globalMap, moduleDepGraph, reverseDepGraph) {
  const defaultGlobals = [
    // safe
    'console',
    'atob',
    'btoa',
    // frequently used
    'setTimeout',
    'clearTimeout',
    'clearInterval',
    'setInterval',
  ]
  let moduleGlobalContent = []
  let depGraphContent = []
  Object.keys(globalMap).map(moduleName => {
    const moduleGlobals = globalMap[moduleName]
    if (!moduleGlobals) return
    const globalNames = Array.from(moduleGlobals.values()).filter(glob => !defaultGlobals.includes(glob))
    if (!globalNames.length) return
    // generate code for module globals config
    const globalsList = serializeStringArray(globalNames)
    moduleGlobalContent.push(`exposeToModule('${moduleName}', ${globalsList})`)
    // generate code for putting config in dep graph
    const depPaths = calculateDepPaths(moduleName, reverseDepGraph)
    const depPathSlugs = depPaths.map(pathParts => pathParts.slice(1).join(' '))
    const depLines = depPathSlugs.map(pathSlug => `exposeToDep('${moduleName}', '${pathSlug}')`)
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

function exposeToModule (moduleName, globalNames) {
  const globalsToExpose = getAndBindGlobals(globalNames)
  moduleGlobals[moduleName] = Object.assign({}, defaultGlobals, globalsToExpose)
}

function exposeToDep (moduleName, depPath) {
  depConfig[depPath] = { $: moduleGlobals[moduleName] }
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
  `)
}


function calculateDepPaths (moduleName, reverseDepGraph, partialPath) {
  // only present in recursion
  if (!partialPath) partialPath = [moduleName]
  // fans out into each new possibility
  const nextDeps = reverseDepGraph[moduleName]
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

function unique(arr) {
  return Array.from(new Set(arr))
}