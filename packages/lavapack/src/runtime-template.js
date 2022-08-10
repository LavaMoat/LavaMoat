;(function(){

  let scuttled = false;

  const moduleRegistry = new Map()
  const lavamoatPolicy = { resources: {} }
  const debugMode = false
  const statsMode = false

  // initialize the kernel
  const reportStatsHook = statsMode ? __reportStatsHook__ : () => {}
  const createKernel = __createKernel__
  const kernel = createKernel({
    runWithPrecompiledModules: true,
    lavamoatConfig: lavamoatPolicy,
    loadModuleData,
    getRelativeModuleId,
    prepareModuleInitializerArgs,
    globalThisRefs: ['window', 'self', 'global', 'globalThis'],
    debugMode,
    reportStatsHook,
  })
  const { internalRequire } = kernel

  // create a lavamoat pulic API for loading modules over multiple files
  const LavaPack = {
    loadPolicy: Object.freeze(loadPolicy),
    loadBundle: Object.freeze(loadBundle),
    runModule: Object.freeze(runModule),
  }
  // in debug mode, expose the kernel on the LavaPack API
  if (debugMode) {
    LavaPack._kernel = kernel
  }

  globalThis.LavaPack = Object.freeze(LavaPack)
  return


  function loadModuleData (moduleId) {
    if (!moduleRegistry.has(moduleId)) {
      throw new Error(`no module registered for "${moduleId}" (${typeof moduleId})`)
    }
    return moduleRegistry.get(moduleId)
  }

  function getRelativeModuleId (parentModuleId, requestedName) {
    const parentModuleData = loadModuleData(parentModuleId)
    if (!(requestedName in parentModuleData.deps)) {
      console.warn(`missing dep: ${parentModuleData.package} requested ${requestedName}`)
    }
    return parentModuleData.deps[requestedName] || requestedName
  }

  function prepareModuleInitializerArgs (requireRelativeWithContext, moduleObj, moduleData) {
    const require = requireRelativeWithContext
    const module = moduleObj
    const exports = moduleObj.exports
    // bify direct module instantiation disabled ("arguments[4]")
    return [require, module, exports, null, null]
  }

  // it is called by the policy loader or modules collection
  function loadPolicy (bundlePolicy) {
    // verify + load config
    Object.entries(bundlePolicy.resources || {}).forEach(([packageName, packageConfig]) => {
      if (packageName in lavamoatPolicy) {
        throw new Error(`LavaMoat - loadBundle encountered redundant config definition for package "${packageName}"`)
      }
      lavamoatPolicy.resources[packageName] = packageConfig
    })
  }

  // it is called by the modules collection
  function loadBundle (newModules, entryPoints, bundlePolicy) {
    // verify + load config
    if (bundlePolicy) loadPolicy(bundlePolicy)
    // verify + load in each module
    for (const [moduleId, moduleDeps, initFn, { package: packageName, type }] of newModules) {
      // verify that module is new
      if (moduleRegistry.has(moduleId)) {
        throw new Error(`LavaMoat - loadBundle encountered redundant module definition for id "${moduleId}"`)
      }
      // add the module
      moduleRegistry.set(moduleId, {
        type: type || 'js',
        id: moduleId,
        deps: moduleDeps,
        // source: `(${initFn})`,
        precompiledInitializer: initFn,
        package: packageName,
      })
    }

    // scuttle globalThis before running entryPoints
    scuttleGlobalThis()

    // run each of entryPoints
    const entryExports = Array.prototype.map.call(entryPoints, (entryId) => {
      return runModule(entryId)
    })

    // webpack compat: return the first module's exports
    return entryExports[0]
  }

  function runModule (moduleId) {
    if (!moduleRegistry.has(moduleId)) {
      throw new Error(`no module registered for "${moduleId}" (${typeof moduleId})`)
    }
    return internalRequire(moduleId)
  }

  function scuttleGlobalThis() {
    if (scuttled) {
      // scuttling globalThis is only necessary once
      return
    }

    scuttled = true

    let props = [...Object.getOwnPropertyNames(globalThis)]
    if (globalThis?.Window?.prototype) {
      props = [...props, ...Object.getOwnPropertyNames(Window.prototype)]
    }
    if (globalThis?.EventTarget?.prototype) {
      props = [...props, ...Object.getOwnPropertyNames(EventTarget.prototype)]
    }

    const avoids = [
      'getComputedStyle',
      'setTimeout',
      'clearTimeout',
      'console',
      'undefined',
      'NaN',
      'window',
      'document',
      'location',
      'top',
      'Infinity',
      'Object',
      'Compartment',
      'Reflect',
      'Set',
      'Array',
      'Function',
      'Number',
      'parseFloat',
      'parseInt',
      'Boolean',
      'String',
      'Symbol',
      'Promise',
      'RegExp',
      'Error',
      'EvalError',
      'RangeError',
      'ReferenceError',
      'SyntaxError',
      'TypeError',
      'URIError',
      'globalThis',
      'JSON',
      'ArrayBuffer',
      'Uint8Array',
      'Int8Array',
      'Uint16Array',
      'Int16Array',
      'Uint32Array',
      'Int32Array',
      'Float32Array',
      'Float64Array',
      'Uint8ClampedArray',
      'BigUint64Array',
      'BigInt64Array',
      'DataView',
      'Map',
      'BigInt',
      'WeakMap',
      'WeakSet',
      'Proxy',
      'decodeURI',
      'decodeURIComponent',
      'encodeURI',
      'encodeURIComponent',
      'escape',
      'unescape',
      'eval',
      'isFinite',
      'isNaN',
      'lockdown',
      'harden',
      'Math',
      'Date',
      'LavaPack'
    ]

    for (const prop of props) {
      if (!Array.prototype.includes.call(avoids, prop)) {
        Object.defineProperty(window, prop, {value: undefined})
      }
    }
  }

  // called by reportStatsHook
  function onStatsReady (moduleGraphStatsObj) {
    const graphId = Date.now()
    console.warn(`completed module graph init "${graphId}" in ${moduleGraphStatsObj.value}ms ("${moduleGraphStatsObj.name}")`)
    console.warn(`logging module init stats object:`)
    console.warn(JSON.stringify(moduleGraphStatsObj, null, 2))
  }

})()
