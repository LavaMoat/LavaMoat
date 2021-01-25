(function(){

  return createKernel

  function createKernel ({
    // the platform api global
    globalRef,
    // package policy object
    lavamoatConfig,
    // kernel configuration
    loadModuleData,
    getRelativeModuleId,
    prepareModuleInitializerArgs,
    // security options
    debugMode,
    applyExportsDefense = true,
  }) {
    // create SES-wrapped LavaMoat kernel
    // endowments:
    // - console is included for convenience
    // - Math is for untamed Math.random
    // - Date is for untamed Date.now
    const kernelCompartment = new Compartment({ console, Math, Date })
    const makeKernel = kernelCompartment.evaluate(`(${unsafeCreateKernel})\n//# sourceURL=LavaMoat/core/kernel`)
    const lavamoatKernel = makeKernel({
      globalRef,
      lavamoatConfig,
      loadModuleData,
      getRelativeModuleId,
      prepareModuleInitializerArgs,
      debugMode,
      applyExportsDefense,
    })

    return lavamoatKernel
  }

  // this is serialized and run in SES
  // mostly just exists to expose variables to internalRequire and loadBundle
  function unsafeCreateKernel ({
    globalRef,
    debugMode,
    lavamoatConfig,
    loadModuleData,
    getRelativeModuleId,
    prepareModuleInitializerArgs,
    applyExportsDefense,
  }) {
    // "templateRequire" calls are inlined in "generatePrelude"
    const { getEndowmentsForConfig, makeMinimalViewOfRef } = templateRequire('makeGetEndowmentsForConfig')()
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
    // 1. loads the module metadata and policy
    // 2. prepares the execution environment
    // 3. instantiates the module, recursively instantiating dependencies
    // 4. returns the module exports
    function internalRequire (moduleId) {
      // use cached module.exports if module is already instantiated
      if (moduleCache.has(moduleId)) {
        const moduleExports = moduleCache.get(moduleId).exports
        return moduleExports
      }

      // load and validate module metadata
      // if module metadata is missing, throw an error
      const moduleData = loadModuleData(moduleId)
      if (!moduleData) {
        const err = new Error('Cannot find module \'' + moduleId + '\'')
        err.code = 'MODULE_NOT_FOUND'
        throw err
      }
      const packageName = moduleData.package
      if (!packageName) throw new Error(`LavaMoat - invalid packageName for module "${moduleId}"`)
      const moduleSource = moduleData.source
      const packagePolicy = getPolicyForPackage(lavamoatConfig, packageName)
      const moduleMembraneSpace = getMembraneSpaceForModule(moduleData)
      const isRootModule = packageName === '<root>'

      // TODO: i moved this validate code here
      // if an external moduleInitializer is set, ensure it is allowed
      if (moduleData.type === 'native') {
        // ensure package is allowed to have native modules
        if (packagePolicy.native !== true) {
          throw new Error(`LavaMoat - "native" module type not permitted for package "${packageName}", module "${moduleId}"`)
        }
      } else if (moduleData.type !== 'builtin') {
        // builtin module types dont have policy configurations
        // but the packages that can import them are constrained elsewhere
        // here we just ensure that the module type is the only other type with a external moduleInitializer
        throw new Error(`LavaMoat - invalid external moduleInitializer for module type "${moduleData.type}" in package "${packageName}", module "${moduleId}"`)
      }

      // create the initial moduleObj
      const moduleObj = { exports: {} }
      // cache moduleObj here
      // this is important for cycles in the dep graph
      // if you dont cache before running the moduleInitializer
      moduleCache.set(moduleId, moduleObj)

      const moduleInitializer = prepareModuleInitializer(moduleData, globalRef)

      // validate moduleInitializer
      if (typeof moduleInitializer !== 'function') {
        throw new Error(`LavaMoat - moduleInitializer is not defined correctly. got "${typeof moduleInitializer}"\n${moduleSource}`)
      }

      // initialize the module with the correct context
      const initializerArgs = prepareModuleInitializerArgs(requireRelativeWithContext, moduleObj, moduleData)
      moduleInitializer.apply(moduleObj.exports, initializerArgs)
      const moduleExports = moduleObj.exports

      if (applyExportsDefense) {
        // configure membrane defense
        // defense is configured here but applied elsewhere
        // set moduleExports graph to read-only
        deepWalk(moduleExports, (value) => {
          // skip plain values
          if (membrane.shouldSkipBridge(value)) return
          // set this ref to read-only
          moduleMembraneSpace.handlerForRef.set(value, createReadOnlyDistortion({
            setHandlerForRef: (ref, newHandler) => moduleMembraneSpace.handlerForRef.set(ref, newHandler)
          }))
        })
      }

      return moduleExports

      // this is passed to the module initializer
      // it adds the context of the parent module
      // this could be replaced via "Function.prototype.bind" if its more performant
      function requireRelativeWithContext (requestedName) {
        const parentModuleExports = moduleObj.exports
        const parentModuleData = moduleData
        const parentPackageConfig = packagePolicy
        const parentModuleId = moduleId
        return requireRelative({ requestedName, parentModuleExports, parentModuleData, parentPackageConfig, parentModuleId })
      }

    }

    function prepareModuleInitializer (moduleData, globalRef) {
      const { moduleInitializer, package: packageName } = moduleData
      // moduleInitializer may be set by loadModuleData (e.g. native modules)
      if (moduleInitializer) {
        return moduleInitializer
      }
      // otherwise setup initializer from moduleSource
      const isRootModule = packageName === '<root>'
      // prepare endowments
      let endowments
      if (isRootModule) {
        endowments = globalRef
      } else {
        try {
          endowments = getEndowmentsForConfig(globalRef, packagePolicy)
        } catch (err) {
          const errMsg = `Lavamoat - failed to prepare endowments for module "${moduleId}":\n${err.stack}`
          throw new Error(errMsg)
        }
      }
      // maybe membrane-wrap endowments
      let preparedEndowments
      if (applyExportsDefense) {
        // prepare the membrane-wrapped endowments
        const endowmentsMembraneSpace = getMembraneSpaceByName('<endowments>')
        preparedEndowments = membrane.bridge(endowments, endowmentsMembraneSpace, moduleMembraneSpace)
      } else {
        preparedEndowments = endowments
      }
      // prepare the module's SES Compartment
      // endowments:
      // - Math is for untamed Math.random
      // - Date is for untamed Date.now
      const moduleCompartment = new Compartment()
      if (isRootModule) {
        // TODO: root module compartment globalThis does not support global write
        // expose all own properties of globalRef, including non-enumerable
        Object.entries(Object.getOwnPropertyDescriptors(preparedEndowments))
          // ignore properties already defined on compartment global
          .filter(([key]) => !(key in moduleCompartment.globalThis))
          // define property on compartment global
          .forEach(([key, desc]) => Reflect.defineProperty(moduleCompartment.globalThis, key, desc))
        // global circular references otherwise added by prepareCompartmentGlobalFromConfig
        // TODO: should be a platform specific circular ref
        moduleCompartment.globalThis.global = moduleCompartment.globalThis
      } else {
        // sets up read/write access as configured
        const globalsConfig = packagePolicy.globals
        prepareCompartmentGlobalFromConfig(moduleCompartment.globalThis, globalsConfig, preparedEndowments, globalStore)
      }
      // expose membrane for debugging
      if (debugMode) {
        moduleCompartment.globalThis.membrane = membrane
      }
      // execute in module compartment with modified compartment global
      // TODO: move all source mutations elsewhere
      try {
        const sourceURL = moduleData.file || `modules/${moduleId}`
        if (sourceURL.includes('\n')) {
          throw new Error(`LavaMoat - Newlines not allowed in filenames: ${JSON.stringify(sourceURL)}`)
        }
        return moduleCompartment.evaluate(`${moduleSource}\n//# sourceURL=${sourceURL}`)
      } catch (err) {
        console.warn(`LavaMoat - Error evaluating module "${moduleId}" from package "${packageName}" \n${err.stack}`)
        throw err
      }
    }

    // this resolves a module given a requestedName (eg relative path to parent) and a parentModule context
    // the exports are processed via "protectExportsRequireTime" per the module's configuration
    function requireRelative ({ requestedName, parentModuleExports, parentModuleData, parentPackageConfig, parentModuleId }) {
      const parentModulePackageName = parentModuleData.package
      const parentPackagesWhitelist = parentPackageConfig.packages
      const parentBuiltinsWhitelist = Object.entries(parentPackageConfig.builtin)
      .filter(([_, allowed]) => allowed === true)
      .map(([packagePath, allowed]) => packagePath.split('.')[0])

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
      let moduleExports = internalRequire(moduleId)

      // look up config for module
      const moduleData = loadModuleData(moduleId)
      const packageName = moduleData.package

      // disallow requiring packages that are not in the parent's whitelist
      const isSamePackage = packageName === parentModulePackageName
      const parentIsEntryModule = parentModulePackageName === '<root>'
      let isInParentWhitelist = false
      if (moduleData.type === 'builtin') {
        isInParentWhitelist = parentBuiltinsWhitelist.includes(packageName)
      } else {
        isInParentWhitelist = (parentPackagesWhitelist[packageName] === true)
      }

      if (!parentIsEntryModule && !isSamePackage && !isInParentWhitelist) {
        let typeText = ' '
        if (moduleData.type === 'builtin') typeText = ' node builtin '
        throw new Error(`LavaMoat - required${typeText}package not in whitelist: package "${parentModulePackageName}" requested "${packageName}" as "${requestedName}"`)
      }

      // create minimal selection if its a builtin and the whole path is not selected for
      if (!parentIsEntryModule && moduleData.type === 'builtin' && !parentPackageConfig.builtin[moduleId]) {
        const builtinPaths = (
          Object.entries(parentPackageConfig.builtin)
          // grab all allowed builtin paths that match this package
          .filter(([packagePath, allowed]) => allowed === true && moduleId === packagePath.split('.')[0])
          // only include the paths after the packageName
          .map(([packagePath, allowed]) => packagePath.split('.').slice(1).join('.'))
          .sort()
        )
        moduleExports = makeMinimalViewOfRef(moduleExports, builtinPaths)
      }

      if (applyExportsDefense) {
        // apply moduleExports require-time protection
        const isSameMembraneSpace = parentModulePackageName && getMembraneSpaceNameForModule(moduleData) === getMembraneSpaceNameForModule(parentModuleData)
        const needsMembraneProtection = !isSameMembraneSpace
        if (needsMembraneProtection) {
          // apply membrane protections
          const inGraph = getMembraneSpaceForModule(moduleData)
          const outGraph = getMembraneSpaceForModule(parentModuleData)
          moduleExports = membrane.bridge(moduleExports, inGraph, outGraph)
        }
      }

      return moduleExports
    }

    function getMembraneSpaceForModule (moduleData) {
      const spaceName = getMembraneSpaceNameForModule(moduleData)
      return getMembraneSpaceByName(spaceName)
    }

    function getMembraneSpaceNameForModule (moduleData) {
      const { package: packageName, type } = moduleData
      // builtin modules use the endowments MembraneSpace for TypedArray passthrough
      if (type === 'builtin') {
        return '<endowments>'
      }
      // native modules use the endowments MembraneSpace for TypedArray passthrough
      if (type === 'native') {
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
    function getPolicyForPackage (config, packageName) {
      const packageConfig = (config.resources || {})[packageName] || {}
      packageConfig.globals = packageConfig.globals || {}
      packageConfig.packages = packageConfig.packages || {}
      packageConfig.builtin = packageConfig.builtin || {}
      return packageConfig
    }

  }

})()