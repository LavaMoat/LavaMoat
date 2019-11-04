// LavaMoat Prelude
;(function() {

  // define SES
  const SES = (function(){
    const exports = {}
    const module = { exports }
    ;(function(){
// START of injected code from sessDist
__sessDist__
// END of injected code from sessDist
    })()
    return module.exports
  })()

  const realm = SES.makeSESRootRealm({
    mathRandomMode: 'allow',
    errorStackMode: 'allow',
  })
  const sesRequire = realm.makeRequire({
    '@agoric/harden': true,
  })
  const harden = sesRequire('@agoric/harden')

  // define makeMagicCopy
  const unsafeMakeMagicCopy = (function(){
    const exports = {}
    const module = { exports }
    ;(function(){
// START of injected code from magicCopy
__magicCopy__
// END of injected code from magicCopy
    })()
    return module.exports
  })()
  const makeMagicCopy = realm.evaluate(`(${unsafeMakeMagicCopy})`)

  // define makeGetEndowmentsForConfig
  const unsafeMakeGetEndowmentsForConfig = (function(){
    const exports = {}
    const module = { exports }
    ;(function(){
// START of injected code from makeGetEndowmentsForConfig
__makeGetEndowmentsForConfig__
// END of injected code from makeGetEndowmentsForConfig
    })()
    return module.exports
  })()
  const { getEndowmentsForConfig } = realm.evaluate(`(${unsafeMakeGetEndowmentsForConfig})`)()

  // define makePrepareRealmGlobalFromConfig
  const unsafeMakePrepareRealmGlobalFromConfig = (function(){
    const exports = {}
    const module = { exports }
    ;(function(){
// START of injected code from makePrepareRealmGlobalFromConfig
__makePrepareRealmGlobalFromConfig__
// END of injected code from makePrepareRealmGlobalFromConfig
    })()
    return module.exports
  })()
  const { prepareRealmGlobalFromConfig } = realm.evaluate(`(${unsafeMakePrepareRealmGlobalFromConfig})`)()

  const lavamoatConfig = (function(){
// START of injected code from lavamoatConfig
__lavamoatConfig__
// END of injected code from lavamoatConfig
  })()

  return loadBundle


  // this performs an unsafeEval in the context of the provided endowments
  function unsafeEvalWithEndowments(code, endowments) {
    with (endowments) {
      return eval(code)
    }
  }

  function loadBundle (modules, _, entryPoints) {
    // debug - log module content instead of execution
    if (typeof process !== 'undefined' && process.env.MODULE_DUMP) {
      const moduleData = modules[process.env.MODULE_DUMP]
      console.log(JSON.stringify(moduleData))
      return
    }
    const globalRef = (typeof self !== 'undefined') ? self : global
    // setup our global module cache
    const globalCache = {}
    // create SES-wrapped internalRequire
    const createInternalRequire = realm.evaluate(`(${internalRequireWrapper})`, { console })
    const safeInternalRequire = createInternalRequire({
      modules,
      globalCache,
      lavamoatConfig,
      realm,
      harden,
      makeMagicCopy,
      getEndowmentsForConfig,
      prepareRealmGlobalFromConfig,
      unsafeEvalWithEndowments,
      globalRef,
    })
    // load entryPoints
    for (let entryId of entryPoints) {
      safeInternalRequire(entryId, null)
    }
  }

  // this is serialized and run in SES
  // mostly just exists to expose variables to internalRequire
  function internalRequireWrapper ({
    modules,
    globalCache,
    lavamoatConfig,
    realm,
    harden,
    makeMagicCopy,
    getEndowmentsForConfig,
    prepareRealmGlobalFromConfig,
    unsafeEvalWithEndowments,
    globalRef,
  }) {
    const magicCopyForPackage = new Map()
    const globalStore = new Map()

    return internalRequire

    function internalRequire (moduleId) {
      const moduleData = modules[moduleId]

      // if we dont have it, throw an error
      if (!moduleData) {
        const err = new Error('Cannot find module \'' + moduleId + '\'')
        err.code = 'MODULE_NOT_FOUND'
        throw err
      }

      const packageName = moduleData.package
      const moduleCacheSlug = moduleId

      // check our local cache, return exports if hit
      let localCache = globalCache[moduleCacheSlug]
      if (!localCache) {
        localCache = {}
        globalCache[moduleCacheSlug] = localCache
      }
      if (localCache[moduleId]) {
        const module = localCache[moduleId]
        return module.exports
      }

      // prepare the module to be initialized
      const module = { exports: {} }
      localCache[moduleId] = module
      let moduleSource = `(${moduleData.source})`
      if (moduleData.file) {
        const moduleSourceLabel = `// moduleSource: ${moduleData.file}`
        moduleSource += `\n\n${moduleSourceLabel}`
      }
      const configForModule = getConfigForPackage(lavamoatConfig, packageName)
      const isEntryModule = moduleData.package === '<root>'

      // prepare endowments
      const endowmentsFromConfig = getEndowmentsForConfig(globalRef, configForModule)
      let endowments = Object.assign({}, lavamoatConfig.defaultGlobals, endowmentsFromConfig)
      // special circular reference for endowments to fix globalRef in SES
      // see https://github.com/Agoric/SES/issues/123
      endowments._endowments = endowments
      // special case for exposing window
      if (endowments.window) {
        endowments = Object.assign({}, endowments.window, endowments)
      }

      const environment = configForModule.environment || (isEntryModule ? 'unfrozen' : 'frozen')
      const runInSes = environment !== 'unfrozen'

      // determine if its a SES-wrapped or naked module initialization
      let moduleInitializer
      if (runInSes) {
        // set the module initializer as the SES-wrapped version
        const moduleRealm = realm.global.Realm.makeCompartment()
        const globalsConfig = configForModule.globals || {}
        prepareRealmGlobalFromConfig(moduleRealm.global, globalsConfig, endowments, globalStore)
        // execute in module realm with modified realm global
        try {
          moduleInitializer = moduleRealm.evaluate(`${moduleSource}`)
        } catch (err) {
          console.warn(`LavaMoat - Error evaluating module "${moduleId}" from package "${packageName}"`)
          throw err
        }
      } else {
        endowments.global = globalRef
        // set the module initializer as the unwrapped version
        moduleInitializer = unsafeEvalWithEndowments(`${moduleSource}`, endowments)
      }
      if (typeof moduleInitializer !== 'function') {
        throw new Error('LavaMoat - moduleInitializer is not defined correctly')
      }

      // this "modules" interface is exposed to the moduleInitializer https://github.com/browserify/browser-pack/blob/master/prelude.js#L38
      // browserify's browser-resolve uses arguments[4] to do direct module initializations
      // this proxy shims this behavior
      // TODO: would be better to just fix this by removing the indirection
      const modulesProxy = new Proxy({}, {
        get (_, targetModuleId) {
          const fakeModuleDefinition = [fakeModuleInitializer]
          return fakeModuleDefinition

          function fakeModuleInitializer () {
            const targetModuleExports = internalRequire(targetModuleId)
            // const targetModuleExports = scopedRequire(targetModuleId)
            module.exports = targetModuleExports
          }
        }
      })

      // initialize the module with the correct context
      try {
        moduleInitializer.call(module.exports, scopedRequire, module, module.exports, null, modulesProxy)
      } catch (err) {
        console.warn(`LavaMoat - Error instantiating module "${moduleId}" from package "${packageName}"`)
        throw err
      }

      const protectedExports = protectExportsInstantiationTime(module.exports, configForModule)
      return protectedExports


      // this is the require method passed to the module initializer
      // it has a context of the current dependency path and nested config
      function scopedRequire (requestedName) {
        const parentModule = module
        const parentModuleData = moduleData
        return publicRequire({ requestedName, parentModule, parentModuleData })
      }

    }

    function publicRequire ({ requestedName, parentModule, parentModuleData }) {
      const parentPackageName = parentModuleData.package
      const parentModuleId = parentModuleData.id
      const parentModuleDeps = parentModuleData.deps
      const moduleId = parentModuleDeps[requestedName] || requestedName

      if (!(requestedName in parentModuleData.deps)) {
        console.warn(`missing dep: ${parentPackageName} requested ${requestedName}`)
      }

      // recursive requires dont hit cache so it inf loops, so we shortcircuit
      // this only seems to happen with the "timers" which uses and is used by "process"
      if (moduleId === parentModuleId) {
        if (['timers', 'buffer'].includes(requestedName) === false) {
          throw new Error(`LavaMoat - recursive require detected: "${requestedName}"`)
        }
        return parentModule.exports
      }
      // look up config for module
      const moduleData = modules[moduleId]

      // if we dont have it, throw an error
      // TODO: dedupe this with internalRequire
      if (!moduleData) {
        const err = new Error('Cannot find module \'' + moduleId + '\'')
        err.code = 'MODULE_NOT_FOUND'
        throw err
      }

      const packageName = moduleData.package
      const configForModule = getConfigForPackage(lavamoatConfig, packageName)

      // load (or fetch cached) module
      const moduleExports = internalRequire(moduleId)
      // moduleExports require-time protection
      if (parentPackageName && packageName === parentPackageName) {
        // return raw if same package
        return moduleExports
      } else {
        // return exports protected as specified in config
        return protectExportsRequireTime(parentPackageName, moduleExports, configForModule)
      }
    }

    function protectExportsInstantiationTime (moduleExports, config) {
      // moduleExports instantion-time protection
      const exportsDefense = config.exportsDefense || 'magicCopy'
      switch (exportsDefense) {
        case 'magicCopy':
          // do nothing, handled at import time
          break
        // harden exports
        case 'harden':
          // something breaks if we dont manually harden the prototype
          harden(Reflect.getPrototypeOf(moduleExports))
          harden(moduleExports)
          break
        case 'freeze':
          // Todo: deepFreeze/harden
          Object.freeze(moduleExports)
          break

        default:
          throw new Error(`LavaMoat - Unknown exports protection ${exportsDefense}`)
      }

      // return the exports
      return moduleExports
    }

    function protectExportsRequireTime (parentPackageName, moduleExports, config) {
      const exportsDefense = config.exportsDefense || 'magicCopy'
      // prepare magicCopy per package
      let magicCopy = magicCopyForPackage.get(parentPackageName)
      if (!magicCopy) {
        magicCopy = makeMagicCopy()
        magicCopyForPackage.set(parentPackageName, magicCopy)
      }
      switch (exportsDefense) {
        case 'magicCopy':
          return magicCopy(moduleExports)
        // already hardened
        case 'harden':
          return magicCopy(moduleExports)
        // already frozen
        case 'freeze':
          return magicCopy(moduleExports)
        default:
          throw new Error(`LavaMoat - Unknown exports protection ${containment}`)
      }
    }

    function getConfigForPackage (config, packageName) {
      const packageConfig = (config.resources || {})[packageName] || {}
      return packageConfig
    }

    //# sourceURL=internalRequire
  }

})()
