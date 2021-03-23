// LavaMoat Prelude
(function() {

  // identify the globalRef
  const globalRef = (typeof globalThis !== 'undefined') ? globalThis : (typeof self !== 'undefined') ? self : (typeof global !== 'undefined') ? global : undefined
  if (!globalRef) {
    throw new Error('Lavamoat - unable to identify globalRef')
  }

  // config and bundle module store
  const lavamoatConfig = { resources: {} }
  const modules = {}

  // initialize the kernel
  const createKernel = __createKernel__
  const { internalRequire } = createKernel({
    lavamoatConfig,
    loadModuleData,
    getRelativeModuleId,
    prepareModuleInitializerArgs,
    globalThisRefs: ['window', 'self', 'global', 'globalThis']
  })

  // create a lavamoat pulic API for loading modules over multiple files
  const lavamoatPublicApi = Object.freeze({
    loadBundle: Object.freeze(loadBundle),
  })
  globalRef.LavaMoat = lavamoatPublicApi

  return loadBundle


  // it is called by the modules collection that will be appended to this file
  function loadBundle (newModules, entryPoints, newConfig) {
    // verify + load config
    Object.entries(newConfig.resources || {}).forEach(([packageName, packageConfig]) => {
      if (packageName in lavamoatConfig) {
        throw new Error(`LavaMoat - loadBundle encountered redundant config definition for package "${packageName}"`)
      }
      lavamoatConfig.resources[packageName] = packageConfig
    })
    // verify + load in each module
    for (const [moduleId, moduleData] of Object.entries(newModules)) {
      // verify that module is new
      if (moduleId in modules) {
        throw new Error(`LavaMoat - loadBundle encountered redundant module definition for id "${moduleId}"`)
      }
      // add the module
      modules[moduleId] = moduleData
    }
    // run each of entryPoints
    const entryExports = Array.prototype.map.call(entryPoints, (entryId) => {
      return internalRequire(entryId)
    })
    // webpack compat: return the first module's exports
    return entryExports[0]
  }

  function loadModuleData (moduleId) {
    return modules[moduleId]
  }

  function getRelativeModuleId (parentModuleId, requestedName) {
    const parentModuleData = modules[parentModuleId]
    if (!(requestedName in parentModuleData.deps)) {
      console.warn(`missing dep: ${parentModuleData.package} requested ${requestedName}`)
    }
    return parentModuleData.deps[requestedName] || requestedName
  }

  function prepareModuleInitializerArgs (requireRelativeWithContext, moduleObj, moduleData) {
    const require = requireRelativeWithContext
    const module = moduleObj
    const exports = moduleObj.exports

    // browserify goop:
    // this "modules" interface is exposed to the browserify moduleInitializer
    // https://github.com/browserify/browser-pack/blob/cd0bd31f8c110e19a80429019b64e887b1a82b2b/prelude.js#L38
    // browserify's browser-resolve uses "arguments[4]" to do direct module initializations
    // browserify seems to do this when module references are redirected by the "browser" field
    // this proxy shims this behavior
    // this is utilized by browserify's dedupe feature
    // though in the original browser-pack prelude it has a side effect that it is re-instantiated from the original module (no shared closure state)
    const directModuleInstantiationInterface = new Proxy({}, {
      get (_, targetModuleId) {
        const fakeModuleDefinition = [fakeModuleInitializer]
        return fakeModuleDefinition

        function fakeModuleInitializer () {
          const targetModuleExports = requireRelativeWithContext(targetModuleId)
          moduleObj.exports = targetModuleExports
        }
      }
    })

    return [require, module, exports, null, directModuleInstantiationInterface]
  }

})()
