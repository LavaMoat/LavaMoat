;(function(){

  const moduleRegistry = new Map()
  const moduleCache = new Map()

  // create a lavamoat pulic API for loading modules over multiple files
  const LavaPack = Object.freeze({
    loadBundle: Object.freeze(loadBundle),
    runModule: Object.freeze(runModule),
  })

  globalThis.LavaPack = LavaPack

  // it is called by the modules collection that will be appended to this file
  function loadBundle (newModules, entryPoints, lavamoatPolicy) {
    // verify + load config
    Object.entries(lavamoatPolicy.resources || {}).forEach(([packageName, packageConfig]) => {
      if (packageName in lavamoatConfig) {
        throw new Error(`LavaMoat - loadBundle encountered redundant config definition for package "${packageName}"`)
      }
      lavamoatConfig.resources[packageName] = packageConfig
    })
    // verify + load in each module
    for (const [moduleId, moduleDeps, initFn] of newModules) {
      // verify that module is new
      if (moduleRegistry.has(moduleId)) {
        throw new Error(`LavaMoat - loadBundle encountered redundant module definition for id "${moduleId}"`)
      }
      // add the module
      moduleRegistry.set(moduleId, { deps: moduleDeps, moduleInitializer: initFn })
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
    if (moduleCache.has(moduleId)) {
      const moduleObject = moduleCache.get(moduleId)
      return moduleObject.exports
    }
    const moduleObject = { exports: {} }
    moduleCache.set(moduleId, moduleObject)
    const moduleData = moduleRegistry.get(moduleId)
    const localRequire = requireRelative.bind(null, moduleId, moduleData)
    moduleData.moduleInitializer.call(moduleObject.exports, localRequire, moduleObject, moduleObject.exports)
    return moduleObject.exports
  }

  function requireRelative (parentId, parentData, requestedName) {
    const resolvedId = (parentData.deps || {})[requestedName] || requestedName
    return runModule(resolvedId)
  }

})()