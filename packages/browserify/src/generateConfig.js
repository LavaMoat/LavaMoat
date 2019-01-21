const through = require('through2')
const moduleNameFromPath = require('module-name-from-path')
const inspectGlobals = require('./inspectGlobals')

module.exports = { createConfigSpy }


function createConfigSpy ({ onResult }) {
  const globalMap = {}

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
    // skip for project files (files not from deps)
    if (!isDependency) return
    // gather config info
    const foundGlobals = inspectGlobals(dep.source)
    // skip if no results
    if (!foundGlobals.length) return
    // add globals to map
    const globalNames = foundGlobals.map(variable => variable.name)
    const moduleGlobal = globalMap[moduleName]
    if (moduleGlobal) {
      globalNames.forEach(glob => moduleGlobal.add(glob))
    } else {
      globalMap[moduleName] = new Set(globalNames)
    }
  }

  function onEnd () {
    const config = generateConfig(globalMap)
    // console.log(config)
    onResult(config)
  }
}

function generateConfig (globalMap) {
  const defaultGlobals = ['console', 'btoa']
  let moduleGlobalContent = []
  Object.keys(globalMap).map(moduleName => {
    const moduleGlobals = globalMap[moduleName]
    if (!moduleGlobals) return
    const globalNames = Array.from(moduleGlobals.values()).filter(glob => !defaultGlobals.includes(glob))
    if (!globalNames.length) return
    moduleGlobalContent.push(`moduleGlobals['${moduleName}'] = Object.assign({}, defaultGlobals, { ${globalNames.join(', ')} }`)
  })
  return (`
const rootGlobal = {}
const globalRefs = { self: rootGlobal, window: rootGlobal }
const defaultGlobals = { ${defaultGlobals.join(', ')} }
// set per-module globals config
const moduleGlobals = {}
${moduleGlobalContent.join('\n')}
// set in dep graph
// depGraph goes here
  `)
}