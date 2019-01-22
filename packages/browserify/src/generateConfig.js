const through = require('through2')
const moduleNameFromPath = require('module-name-from-path')
const flatMap = require('lodash.flatmap')
const inspectGlobals = require('./inspectGlobals')

module.exports = { createConfigSpy }

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
    const moduleName = moduleNameFromPath(dep.id)
    // moduleName is falsy for project files not from dependencies
    const isDependency = !!moduleName
    updateModuleDeps(isDependency ? moduleName : rootSlug, dep.deps)
    // skip for project files (files not from deps)
    if (!isDependency) return
    // gather config info
    const foundGlobals = inspectGlobals(dep.source, moduleName)
    const globalNames = foundGlobals.map(variable => variable.name).filter(name => !ignoredGlobals.includes(name))
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
    const newDeps = Array.from(new Set(Object.values(fileDeps).map(moduleNameFromPath)))
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
    let value = self[glob]
    if (!value) return
    // necesary for 'setTimeout' etc
    if (typeof value === 'function') value = value.bind(window)
    selectedGlobals[glob] = value
  })
  return selectedGlobals
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