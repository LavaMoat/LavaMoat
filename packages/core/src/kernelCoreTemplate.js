(function(){

  return createKernel

  function createKernel ({ globalRef, debugMode, unsafeEvalWithEndowments, lavamoatConfig, loadModuleData, getRelativeModuleId, prepareModuleInitializerArgs }) {
    // create SES-wrapped LavaMoat kernel
    const kernelCompartment = new Compartment({ console })
    const makeKernel = kernelCompartment.evaluate(`(${unsafeCreateKernel})`)
    const lavamoatKernel = makeKernel({
      unsafeEvalWithEndowments,
      globalRef,
      debugMode,
      lavamoatConfig,
      loadModuleData,
      getRelativeModuleId,
      prepareModuleInitializerArgs,
    })

    return lavamoatKernel
  }

  // this is serialized and run in SES
  // mostly just exists to expose variables to internalRequire and loadBundle
  function unsafeCreateKernel ({
    unsafeEvalWithEndowments,
    globalRef,
    debugMode,
    lavamoatConfig,
    loadModuleData,
    getRelativeModuleId,
    prepareModuleInitializerArgs,
  }) {
    // "templateRequire" calls are inlined in "generatePrelude"
    const { getEndowmentsForConfig } = templateRequire('makeGetEndowmentsForConfig')()
    const { prepareCompartmentGlobalFromConfig } = templateRequire('makePrepareRealmGlobalFromConfig')()
    const { Membrane } = templateRequire('cytoplasm')
    const createReadOnlyDistortion = templateRequire('cytoplasm/distortions/readOnly')

    const moduleCache = new Map()
    const globalStore = new Map()
    const membraneSpaceForPackage = new Map()
    const membrane = new Membrane({ debugMode })
    const allowTypedArrays = (() => {
      const TypedArray = Object.getPrototypeOf(Uint8Array)
      return (value) => value instanceof TypedArray
    })()
    const endowmentsMembraneSpace = membrane.makeMembraneSpace({
      label: '<endowments>',
      // this ensures all typedarrays that are passed to the endowments membrane are unwrapped
      passthroughFilter: allowTypedArrays,
    })
    membraneSpaceForPackage.set(endowmentsMembraneSpace.label, endowmentsMembraneSpace)

    return {
      internalRequire,
      membrane,
    }

    // this function instantiaties a module from a moduleId.
    // 1. loads the config for the module
    // 2. instantiates in the config specified environment
    // 3. calls config specified strategy for "protectExportsInstantiationTime"
    function internalRequire (moduleId) {
      if (moduleCache.has(moduleId)) {
        const moduleExports = moduleCache.get(moduleId).exports
        return moduleExports
      }
      const moduleData = loadModuleData(moduleId)

      // if we dont have it, throw an error
      if (!moduleData) {
        const err = new Error('Cannot find module \'' + moduleId + '\'')
        err.code = 'MODULE_NOT_FOUND'
        throw err
      }

      // prepare the module to be initialized
      const packageName = moduleData.package
      const moduleSource = moduleData.sourceString
      const configForModule = getConfigForPackage(lavamoatConfig, packageName)
      const moduleMembraneSpace = getMembraneSpaceForModule(moduleData)
      const isEntryModule = moduleData.package === '<root>'

      // create the initial moduleObj
      const moduleObj = { exports: {} }
      // cache moduleObj here
      moduleCache.set(moduleId, moduleObj)
      // this is important for multi-module circles in the dep graph
      // if you dont cache before running the moduleInitializer

      // prepare endowments
      const endowmentsFromConfig = getEndowmentsForConfig(globalRef, configForModule)
      let endowments = Object.assign({}, endowmentsFromConfig)
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

      // allow moduleInitializer to be set by loadModuleData
      let moduleInitializer = moduleData.moduleInitializer
      // otherwise setup initializer from moduleSource
      if (!moduleInitializer) {

        // prepare the membrane-wrapped endowments
        const endowmentsMembraneSpace = getMembraneSpaceByName('<endowments>')
        const membraneWrappedEndowments = membrane.bridge(endowments, endowmentsMembraneSpace, moduleMembraneSpace)

        // determine if its a SES-wrapped or naked module initialization
        if (runInSes) {

          // set the module initializer as the SES-wrapped version
          const moduleCompartment = new Compartment()
          const globalsConfig = configForModule.globals
          prepareCompartmentGlobalFromConfig(moduleCompartment.global, globalsConfig, membraneWrappedEndowments, globalStore)
          // expose membrane for debugging
          if (debugMode) {
            moduleCompartment.global.membrane = membrane
          }
          // execute in module compartment with modified compartment global
          try {
            moduleInitializer = moduleCompartment.evaluate(`${moduleSource}`)
          } catch (err) {
            console.warn(`LavaMoat - Error evaluating module "${moduleId}" from package "${packageName}"`)
            throw err
          }

        } else {
          // expose the raw global on the endowments (?)
          endowments.global = globalRef
          // expose membrane for debugging
          if (debugMode) {
            endowments.membrane = membrane
          }
          // set the module initializer as the unwrapped version
          moduleInitializer = unsafeEvalWithEndowments(`${moduleSource}`, membraneWrappedEndowments)

        }
      }
      if (typeof moduleInitializer !== 'function') {
        throw new Error(`LavaMoat - moduleInitializer is not defined correctly. got "${typeof moduleInitializer}" ses:${runInSes}\n${moduleSource}`)
      }

      const initializerArgs = prepareModuleInitializerArgs(requireRelativeWithContext, moduleObj, moduleData)

      // initialize the module with the correct context
      moduleInitializer.apply(moduleObj.exports, initializerArgs)

      // configure membrane defense
      // defense is configured here but applied elsewhere
      // set moduleExports graph to read-only
      const moduleExports = moduleObj.exports
      deepWalk(moduleExports, (value) => {
        // skip plain values
        if (membrane.shouldSkipBridge(value)) return
        // set this ref to read-only
        moduleMembraneSpace.handlerForRef.set(value, createReadOnlyDistortion({
          setHandlerForRef: (ref, newHandler) => moduleMembraneSpace.handlerForRef.set(ref, newHandler)
        }))
      })

      return moduleExports

      // this is passed to the module initializer
      // it adds the context of the parent module
      // this could be replaced via "Function.prototype.bind" if its more performant
      function requireRelativeWithContext (requestedName) {
        const parentModuleExports = moduleObj.exports
        const parentModuleData = moduleData
        const parentPackageConfig = configForModule
        const parentModuleId = moduleId
        return requireRelative({ requestedName, parentModuleExports, parentModuleData, parentPackageConfig, parentModuleId })
      }

    }

    // this resolves a module given a requestedName (eg relative path to parent) and a parentModule context
    // the exports are processed via "protectExportsRequireTime" per the module's configuration
    function requireRelative ({ requestedName, parentModuleExports, parentModuleData, parentPackageConfig, parentModuleId }) {
      const parentModulePackageName = parentModuleData.package
      const parentPackagesWhitelist = parentPackageConfig.packages

      // resolve the moduleId from the requestedName
      const moduleId = getRelativeModuleId(parentModuleId, requestedName)

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
      const moduleData = loadModuleData(moduleId)
      const packageName = moduleData.package

      // disallow requiring packages that are not in the parent's whitelist
      const isSamePackage = packageName === parentModulePackageName
      const isInParentWhitelist = parentPackagesWhitelist[packageName] === true
      const parentIsEntryModule = parentModulePackageName === '<root>'

      if (!parentIsEntryModule && !isSamePackage && !isInParentWhitelist) {
        throw new Error(`LavaMoat - required package not in whitelist: package "${parentModulePackageName}" requested "${packageName}" as "${requestedName}"`)
      }

      // apply moduleExports require-time protection
      const isSameMembraneSpace = parentModulePackageName && getMembraneSpaceNameForModule(moduleData) === getMembraneSpaceNameForModule(parentModuleData)
      const needsMembraneProtection = !isSameMembraneSpace
      if (needsMembraneProtection) {
        // apply membrane protections
        const inGraph = getMembraneSpaceForModule(moduleData)
        const outGraph = getMembraneSpaceForModule(parentModuleData)
        const protectedExports = membrane.bridge(moduleExports, inGraph, outGraph)
        return protectedExports
      } else {
        // return raw if same package
        return moduleExports
      }
    }

    function getMembraneSpaceForModule (moduleData) {
      const spaceName = getMembraneSpaceNameForModule(moduleData)
      return getMembraneSpaceByName(spaceName)
    }

    function getMembraneSpaceNameForModule (moduleData) {
      const { package: packageName, type } = moduleData
      // native modules use the endowments MembraneSpace for TypedArray passthrough
      if (type === 'native') {
        return '<endowments>'
      }
      // core modules use the endowments MembraneSpace for TypedArray passthrough
      if (type === 'core') {
        return '<endowments>'
      }
      // otherwise use package name
      return packageName
    }

    function getMembraneSpaceByName (spaceName) {
      // if exists, return it
      if (membraneSpaceForPackage.has(spaceName)) {
        return membraneSpaceForPackage.get(spaceName)
      }

      // create the membrane space for this package
      const membraneSpace = membrane.makeMembraneSpace({
        label: spaceName,
        // default is a transparent membrane handler
        createHandler: () => Reflect,
      })
      membraneSpaceForPackage.set(spaceName, membraneSpace)
      return membraneSpace
    }

    function deepWalk (value, visitor) {
      // the value itself
      visitor(value)
      // lookup children
      let proto, props = []
      try {
        proto = Object.getPrototypeOf(value)
        props = Object.values(Object.getOwnPropertyDescriptors(value))
      } catch (_) {
        // ignore error if we can't get proto/props (value is undefined, null, etc)
      }
      // the own properties
      props.map(entry => {
        if ('value' in entry) visitor(entry.value)
      })
      // the prototype
      if (proto) visitor(proto)
    }

    // this gets the lavaMoat config for a module by packageName
    // if there were global defaults (e.g. everything gets "console") they could be applied here
    function getConfigForPackage (config, packageName) {
      const packageConfig = (config.resources || {})[packageName] || {}
      packageConfig.globals = packageConfig.globals || {}
      packageConfig.packages = packageConfig.packages || {}
      return packageConfig
    }

  }

})()