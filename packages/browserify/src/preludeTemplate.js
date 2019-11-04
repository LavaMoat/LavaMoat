// LavaMoat Prelude
;(function() {

  // define SES
  // "templateRequire" calls are inlined in "generatePrelude"
  const SES = templateRequire('ses')

  const realm = SES.makeSESRootRealm({
    mathRandomMode: 'allow',
    errorStackMode: 'allow',
  })
  const sesRequire = realm.makeRequire({
    '@agoric/harden': true,
  })
  const harden = sesRequire('@agoric/harden')

  return loadBundle


  // this performs an unsafeEval in the context of the provided endowments
  function unsafeEvalWithEndowments(code, endowments) {
    with (endowments) {
      return eval(code)
    }
  }

  function loadBundle (modules, _, entryPoints) {
    const globalRef = (typeof self !== 'undefined') ? self : global
    // create SES-wrapped internalRequire
    const makeInternalRequire = realm.evaluate(`(${unsafeMakeInternalRequire})`, { console })
    const internalRequire = makeInternalRequire({
      modules,
      realm,
      harden,
      unsafeEvalWithEndowments,
      globalRef,
    })
    // run each of entryPoints (ignores any exports of entryPoints)
    for (let entryId of entryPoints) {
      internalRequire(entryId)
    }
  }

  // this is serialized and run in SES
  // mostly just exists to expose variables to internalRequire
  function unsafeMakeInternalRequire ({
    modules,
    realm,
    harden,
    unsafeEvalWithEndowments,
    globalRef,
  }) {
    // "templateRequire" calls are inlined in "generatePrelude"
    const makeMagicCopy = templateRequire('makeMagicCopy')
    const { getEndowmentsForConfig } = templateRequire('makeGetEndowmentsForConfig')()
    const { prepareRealmGlobalFromConfig } = templateRequire('makePrepareRealmGlobalFromConfig')()
    const lavamoatConfig = (function(){
  // START of injected code from lavamoatConfig
  __lavamoatConfig__
  // END of injected code from lavamoatConfig
    })()

    const magicCopyForPackage = new Map()
    const globalStore = new Map()

    return internalRequire


    // this function instantiaties a module from a moduleId.
    // 1. loads the config for the module
    // 2. instantiates in the config specified environment
    // 3. calls config specified strategy for "protectExportsInstantiationTime"
    function internalRequire (moduleId) {
      const moduleData = modules[moduleId]

      // if we dont have it, throw an error
      if (!moduleData) {
        const err = new Error('Cannot find module \'' + moduleId + '\'')
        err.code = 'MODULE_NOT_FOUND'
        throw err
      }

      const packageName = moduleData.package
      // prepare the module to be initialized
      const module = { exports: {} }
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

      // this "modules" interface is exposed to the browserify moduleInitializer https://github.com/browserify/browser-pack/blob/master/prelude.js#L38
      // browserify's browser-resolve uses arguments[4] to do direct module initializations
      // this proxy shims this behavior
      // TODO: would be better to just fix this by removing the indirection
      const modulesProxy = new Proxy({}, {
        get (_, targetModuleId) {
          const fakeModuleDefinition = [fakeModuleInitializer]
          return fakeModuleDefinition

          function fakeModuleInitializer () {
            const targetModuleExports = scopedRequire(targetModuleId)
            module.exports = targetModuleExports
          }
        }
      })

      // initialize the module with the correct context
      try {
        moduleInitializer.call(module.exports, requireRelativeWithContext, module, module.exports, null, modulesProxy)
      } catch (err) {
        console.warn(`LavaMoat - Error instantiating module "${moduleId}" from package "${packageName}"`)
        throw err
      }

      const protectedExports = protectExportsInstantiationTime(module.exports, configForModule)
      return protectedExports


      // this is passed to the module initializer
      // it adds the context of the parent module
      function requireRelativeWithContext (requestedName) {
        const parentModuleExports = module.exports
        const parentModuleData = moduleData
        return requireRelative({ requestedName, parentModuleExports, parentModuleData })
      }

    }

    // this resolves a module given a requestedName (eg relative path to parent) and a parentModule context
    // the exports are processed via "protectExportsRequireTime" per the module's configuration
    function requireRelative ({ requestedName, parentModuleExports, parentModuleData }) {
      const parentModuleId = parentModuleData.id
      const parentModulePackageName = parentModuleData.package
      const parentModuleDepsMap = parentModuleData.deps
      const moduleId = parentModuleDepsMap[requestedName] || requestedName

      if (!(requestedName in parentModuleData.deps)) {
        console.warn(`missing dep: ${parentModulePackageName} requested ${requestedName}`)
      }

      // recursive requires dont hit cache so it inf loops, so we shortcircuit
      // this only seems to happen with the "timers" which uses and is used by "process"
      if (moduleId === parentModuleId) {
        if (['timers', 'buffer'].includes(requestedName) === false) {
          throw new Error(`LavaMoat - recursive require detected: "${requestedName}"`)
        }
        return parentModuleExports
      }

      // load module
      const moduleExports = internalRequire(moduleId)

      // look up config for module
      const moduleData = modules[moduleId]
      const packageName = moduleData.package
      const configForModule = getConfigForPackage(lavamoatConfig, packageName)

      // moduleExports require-time protection
      if (parentModulePackageName && packageName === parentModulePackageName) {
        // return raw if same package
        return moduleExports
      } else {
        // return exports protected as specified in config
        return protectExportsRequireTime(parentModulePackageName, moduleExports, configForModule)
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
