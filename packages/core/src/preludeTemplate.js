// LavaMoat Prelude
(function() {

  const debugMode = __lavamoatDebugMode__

  // identify the globalRef
  const globalRef = (typeof self !== 'undefined') ? self : global

  // create the SES rootRealm
  // "templateRequire" calls are inlined in "generatePrelude"
  const SES = templateRequire('ses')
  const sesOptions = {
    // this is introduces non-determinism, but is otherwise safe
    mathRandomMode: 'allow',
  }

  // only reveal error stacks in debug mode
  if (debugMode === true) {
    sesOptions.errorStackMode = 'allow'
  }
  const realm = SES.makeSESRootRealm(sesOptions)

  // config and bundle module store
  const lavamoatConfig = { resources: {} }
  const modules = {}

  // initialize the kernel
  const createKernel = __createKernel__
  const { internalRequire } = createKernel({
    realm,
    unsafeEvalWithEndowments,
    globalRef,
    debugMode,
    lavamoatConfig,
    loadModuleData,
    getRelativeModuleId,
  })

  // create a lavamoat pulic API for loading modules over multiple files
  const lavamoatPublicApi = Object.freeze({
    loadBundle: Object.freeze(loadBundle),
  })
  globalRef.LavaMoat = lavamoatPublicApi

  return loadBundle


  // this performs an unsafeEval in the context of the provided endowments
  function unsafeEvalWithEndowments(code, endowments) {
    with (endowments) {
      return eval(code)
    }
  }


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
      // convert all module source to string
      // this could happen at build time,
      // but shipping it as code makes it easier to debug, maybe
      for (let moduleData of Object.values(newModules)) {
        let moduleSource = `(${moduleData.source})`
        if (moduleData.file) {
          const moduleSourceLabel = `// moduleSource: ${moduleData.file}`
          moduleSource += `\n\n${moduleSourceLabel}`
        }
        moduleData.sourceString = moduleSource
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
      console.warn(`missing dep: ${parentModuleData.packageName} requested ${requestedName}`)
    }
    return parentModuleData.deps[requestedName] || requestedName
  }

})()
