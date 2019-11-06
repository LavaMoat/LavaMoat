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

  // this function is returned from the top level closure
  // it is called by the modules collection that will be appended to this file
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

    // convert all module source to string
    // this could happen at build time,
    // but shipping it as code makes it easier to debug, maybe
    for (let moduleData of Object.values(modules)) {
      let moduleSource = `(${moduleData.source})`
      if (moduleData.file) {
        const moduleSourceLabel = `// moduleSource: ${moduleData.file}`
        moduleSource += `\n\n${moduleSourceLabel}`
      }
      moduleData.sourceString = moduleSource
    }

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

      // prepare the module to be initialized
      const packageName = moduleData.package
      const module = { exports: {} }
      const moduleSource = moduleData.sourceString
      const configForModule = getConfigForPackage(lavamoatConfig, packageName)
      const isEntryModule = moduleData.package === '<root>'

      // prepare endowments
      const endowmentsFromConfig = getEndowmentsForConfig(globalRef, configForModule)
      let endowments = Object.assign({}, lavamoatConfig.defaultGlobals, endowmentsFromConfig)
      // special case for exposing window
      if (endowments.window) {
        endowments = Object.assign({}, endowments.window, endowments)
      }

      // the default environment is "unfrozen" for the app root modules, "frozen" for dependencies
      // this may be a bad default, but was meant to ease app development
      // "frozen" means in a SES container
      // "unfrozen" means via unsafeEvalWithEndowments
      const environment = configForModule.environment || (isEntryModule ? 'unfrozen' : 'frozen')
      const runInSes = environment !== 'unfrozen'

      // determine if its a SES-wrapped or naked module initialization
      let moduleInitializer
      if (runInSes) {
        // set the module initializer as the SES-wrapped version
        const moduleRealm = realm.global.Realm.makeCompartment()
        const globalsConfig = configForModule.globals
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

      // browserify goop:
      // this "modules" interface is exposed to the browserify moduleInitializer
      // https://github.com/browserify/browser-pack/blob/cd0bd31f8c110e19a80429019b64e887b1a82b2b/prelude.js#L38
      // browserify's browser-resolve uses "arguments[4]" to do direct module initializations
      // browserify seems to do this when module references are redirected by the "browser" field
      // this proxy shims this behavior
      // TODO: would be better to just fix this by removing the indirection (maybe in https://github.com/browserify/module-deps?)
      // though here and in the original browser-pack prelude it has a side effect that it is re-instantiated from the original module (no shared closure state)
      const directModuleInstantiationInterface = new Proxy({}, {
        get (_, targetModuleId) {
          const fakeModuleDefinition = [fakeModuleInitializer]
          return fakeModuleDefinition

          function fakeModuleInitializer () {
            const targetModuleExports = requireRelativeWithContext(targetModuleId)
            module.exports = targetModuleExports
          }
        }
      })

      // initialize the module with the correct context
      try {
        moduleInitializer.call(module.exports, requireRelativeWithContext, module, module.exports, null, directModuleInstantiationInterface)
      } catch (err) {
        console.warn(`LavaMoat - Error instantiating module "${moduleId}" from package "${packageName}"`)
        throw err
      }

      const protectedExports = protectExportsInstantiationTime(module.exports, configForModule)
      return protectedExports


      // this is passed to the module initializer
      // it adds the context of the parent module
      // this could be replaced via "Function.prototype.bind" if its more performant
      function requireRelativeWithContext (requestedName) {
        const parentModuleExports = module.exports
        const parentModuleData = moduleData
        const parentPackageConfig = configForModule
        return requireRelative({ requestedName, parentModuleExports, parentModuleData, parentPackageConfig })
      }

    }

    // this resolves a module given a requestedName (eg relative path to parent) and a parentModule context
    // the exports are processed via "protectExportsRequireTime" per the module's configuration
    function requireRelative ({ requestedName, parentModuleExports, parentModuleData, parentPackageConfig }) {
      const parentModuleId = parentModuleData.id
      const parentModulePackageName = parentModuleData.package
      const parentModuleDepsMap = parentModuleData.deps
      const parentPackagesWhitelist = parentPackageConfig.packages

      // resolve the moduleId from the requestedName
      // this is just a warning if the entry is missing in the deps map (local requestedName -> global moduleId)
      // if it is missing we try to fetch it anyways using the requestedName as the moduleId
      // The dependency whitelist should still be enforced elsewhere
      const moduleId = parentModuleDepsMap[requestedName] || requestedName
      if (!(requestedName in parentModuleData.deps)) {
        console.warn(`missing dep: ${parentModulePackageName} requested ${requestedName}`)
      }

      // browserify goop:
      // recursive requires dont hit cache so it inf loops, so we shortcircuit
      // this only seems to happen with a few browserify builtins (nodejs builtin module polyfills)
      // we could likely allow any requestedName since it can only refer to itself
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

      // disallow requiring packages that are not in the parent's whitelist
      const isSamePackage = packageName === parentModulePackageName
      const isInParentWhitelist = packageName in parentPackagesWhitelist
      if (!isSamePackage && !isInParentWhitelist) {
        throw new Error(`LavaMoat - required package not in whitelist: package "${parentModulePackageName}" requested "${packageName}" as "${requestedName}"`)
      }

      // moduleExports require-time protection
      if (parentModulePackageName && packageName === parentModulePackageName) {
        // return raw if same package
        return moduleExports
      } else {
        // return exports protected as specified in config
        return protectExportsRequireTime(parentModulePackageName, moduleExports, configForModule)
      }
    }

    // this is a hook for protecting exports immediately after instantiation (e.g. deep freeze)
    function protectExportsInstantiationTime (moduleExports, config) {
      // moduleExports instantion-time protection
      const exportsDefense = config.exportsDefense || 'magicCopy'
      switch (exportsDefense) {
        case 'magicCopy':
          // do nothing, handled at import time
          break
        // other export protection strategies can be added here
        // case 'harden':
        //   ...

        default:
          throw new Error(`LavaMoat - Unknown exports protection ${exportsDefense}`)
      }

      // return the exports
      return moduleExports
    }

    // this is a hook for protecting exports right before importing (e.g. deep clone)
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
        // other export protection strategies can be added here
        // case 'harden':
        //   ...

        default:
          throw new Error(`LavaMoat - Unknown exports protection ${containment}`)
      }
    }

    // this gets the lavaMoat config for a module by packageName
    // if there were global defaults (e.g. everything gets "console") they could be applied here
    function getConfigForPackage (config, packageName) {
      const packageConfig = (config.resources || {})[packageName] || {}
      packageConfig.globals = packageConfig.globals || {}
      packageConfig.packages = packageConfig.packages || {}
      return packageConfig
    }

    //# sourceURL=internalRequire
  }

})()
