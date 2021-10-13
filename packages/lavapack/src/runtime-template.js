;(function(){

  const moduleRegistry = new Map()
  const moduleCache = new Map()
  const lavamoatPolicy = { resources: {} }

  // initialize the kernel
  const createKernel = __createKernel__
  const { internalRequire } = createKernel({
    runWithPrecompiledModules: true,
    lavamoatConfig: lavamoatPolicy,
    loadModuleData,
    getRelativeModuleId,
    prepareModuleInitializerArgs,
    globalThisRefs: ['window', 'self', 'global', 'globalThis'],
  })

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

  // create a lavamoat pulic API for loading modules over multiple files
  const LavaPack = Object.freeze({
    loadPolicy: Object.freeze(loadPolicy),
    loadBundle: Object.freeze(loadBundle),
    runModule: Object.freeze(runModule),
  })

  globalThis.LavaPack = LavaPack

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

})()
