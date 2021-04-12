(function () {
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
    getExternalCompartment,
    globalThisRefs,
    // security options
    debugMode
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
      getExternalCompartment,
      globalThisRefs,
      debugMode
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
    getExternalCompartment,
    globalThisRefs = ['globalThis']
  }) {
    // "templateRequire" calls are inlined in "generatePrelude"
    const generalUtils = templateRequire('makeGeneralUtils')()
    const { getEndowmentsForConfig, makeMinimalViewOfRef, applyEndowmentPropDescTransforms } = templateRequire('makeGetEndowmentsForConfig')(generalUtils)
    const { prepareCompartmentGlobalFromConfig } = templateRequire('makePrepareRealmGlobalFromConfig')(generalUtils)

    const moduleCache = new Map()
    const packageCompartmentCache = new Map()
    const globalStore = new Map()

    const rootPackageName = '<root>'
    const rootPackageCompartment = createRootPackageCompartment(globalRef)

    return {
      internalRequire
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
      if (moduleData.id === undefined) {
        throw new Error('LavaMoat - moduleId is not defined correctly.')
      }

      // parse and validate module data
      const { package: packageName, source: moduleSource } = moduleData
      if (!packageName) throw new Error(`LavaMoat - invalid packageName for module "${moduleId}"`)
      const packagePolicy = getPolicyForPackage(lavamoatConfig, packageName)

      // create the moduleObj and initializer
      const { moduleInitializer, moduleObj } = prepareModuleInitializer(moduleData, packagePolicy)

      // cache moduleObj here
      // this is important to inf loops when hitting cycles in the dep graph
      // must cache before running the moduleInitializer
      moduleCache.set(moduleId, moduleObj)

      // validate moduleInitializer
      if (typeof moduleInitializer !== 'function') {
        throw new Error(`LavaMoat - moduleInitializer is not defined correctly. got "${typeof moduleInitializer}"\n${moduleSource}`)
      }

      // initialize the module with the correct context
      const initializerArgs = prepareModuleInitializerArgs(requireRelativeWithContext, moduleObj, moduleData)
      moduleInitializer.apply(moduleObj.exports, initializerArgs)
      const moduleExports = moduleObj.exports

      return moduleExports

      // this is passed to the module initializer
      // it adds the context of the parent module
      // this could be replaced via "Function.prototype.bind" if its more performant
      function requireRelativeWithContext (requestedName) {
        const parentModuleExports = moduleObj.exports
        const parentModuleData = moduleData
        const parentPackagePolicy = packagePolicy
        const parentModuleId = moduleId
        return requireRelative({ requestedName, parentModuleExports, parentModuleData, parentPackagePolicy, parentModuleId })
      }
    }

    // this resolves a module given a requestedName (eg relative path to parent) and a parentModule context
    // the exports are processed via "protectExportsRequireTime" per the module's configuration
    function requireRelative ({ requestedName, parentModuleExports, parentModuleData, parentPackagePolicy, parentModuleId }) {
      const parentModulePackageName = parentModuleData.package
      const parentPackagesWhitelist = parentPackagePolicy.packages
      const parentBuiltinsWhitelist = Object.entries(parentPackagePolicy.builtin)
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
      const parentIsEntryModule = parentModulePackageName === rootPackageName
      let isInParentWhitelist = false
      if (moduleData.type === 'builtin') {
        isInParentWhitelist = parentBuiltinsWhitelist.includes(packageName)
      } else {
        isInParentWhitelist = (parentPackagesWhitelist[packageName] === true)
      }

      // validate that the import is allowed
      if (!parentIsEntryModule && !isSamePackage && !isInParentWhitelist) {
        let typeText = ' '
        if (moduleData.type === 'builtin') typeText = ' node builtin '
        throw new Error(`LavaMoat - required${typeText}package not in whitelist: package "${parentModulePackageName}" requested "${packageName}" as "${requestedName}"`)
      }

      // create minimal selection if its a builtin and the whole path is not selected for
      if (!parentIsEntryModule && moduleData.type === 'builtin' && !parentPackagePolicy.builtin[moduleId]) {
        const builtinPaths = (
          Object.entries(parentPackagePolicy.builtin)
          // grab all allowed builtin paths that match this package
            .filter(([packagePath, allowed]) => allowed === true && moduleId === packagePath.split('.')[0])
          // only include the paths after the packageName
            .map(([packagePath, allowed]) => packagePath.split('.').slice(1).join('.'))
            .sort()
        )
        moduleExports = makeMinimalViewOfRef(moduleExports, builtinPaths)
      }

      return moduleExports
    }

    function prepareModuleInitializer (moduleData, packagePolicy) {
      const { moduleInitializer, package: packageName, id: moduleId, source: moduleSource } = moduleData

      // moduleInitializer may be set by loadModuleData (e.g. builtin + native modules)
      if (moduleInitializer) {
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
        // moduleObj must be from the same Realm as the moduleInitializer
        // here we are assuming the provided moduleInitializer is from the same Realm as this kernel
        const moduleObj = { exports: {} }
        return { moduleInitializer, moduleObj }
      }

      // setup initializer from moduleSource and compartment.
      // execute in package compartment with globalThis populated per package policy
      const packageCompartment = getCompartmentForPackage(packageName, packagePolicy)
      // TODO: move all source mutations elsewhere
      try {
        const sourceURL = moduleData.file || `modules/${moduleId}`
        if (sourceURL.includes('\n')) {
          throw new Error(`LavaMoat - Newlines not allowed in filenames: ${JSON.stringify(sourceURL)}`)
        }
        // moduleObj must be from the same Realm as the moduleInitializer
        // the dart2js runtime relies on this for some reason
        const moduleObj = packageCompartment.evaluate('({ exports: {} })')
        const moduleInitializer = packageCompartment.evaluate(`${moduleSource}\n//# sourceURL=${sourceURL}`)
        return { moduleInitializer, moduleObj }
      } catch (err) {
        console.warn(`LavaMoat - Error evaluating module "${moduleId}" from package "${packageName}" \n${err.stack}`)
        throw err
      }
    }

    function createRootPackageCompartment (globalRef) {
      if (packageCompartmentCache.has(rootPackageName)) {
        throw new Error('LavaMoat - createRootPackageCompartment called more than once')
      }
      // prepare the root package's SES Compartment
      // endowments:
      // - Math is for untamed Math.random
      // - Date is for untamed Date.now
      const rootPackageCompartment = new Compartment({ Math, Date })
      // find the relevant endowment sources
      const globalProtoChain = getPrototypeChain(globalRef)
      // the index for the common prototypal ancestor, Object.prototype
      // this should always be the last index, but we check just in case
      const commonPrototypeIndex = globalProtoChain.findIndex(globalProtoChainEntry => globalProtoChainEntry === Object.prototype)
      if (commonPrototypeIndex === -1) throw new Error('Lavamoat - unable to find common prototype between Compartment and globalRef')
      // we will copy endowments from all entries in the prototype chain, excluding Object.prototype
      const endowmentSources = globalProtoChain.slice(0, commonPrototypeIndex)

      // call all getters, in case of behavior change (such as with FireFox lazy getters)
      // call on contents of endowmentsSources directly instead of in new array instances. If there is a lazy getter it only changes the original prop desc.
      endowmentSources.forEach(source => {
        const descriptors = Object.getOwnPropertyDescriptors(source)
        Object.values(descriptors).forEach(desc => {
          if ('get' in desc) {
            Reflect.apply(desc.get, globalRef, [])
          }
        })
      })

      const endowmentSourceDescriptors = endowmentSources.map(globalProtoChainEntry => Object.getOwnPropertyDescriptors(globalProtoChainEntry))
      // flatten propDesc collections with precedence for globalThis-end of the prototype chain
      const endowmentDescriptorsFlat = Object.assign(Object.create(null), ...endowmentSourceDescriptors.reverse())
      // expose all own properties of globalRef, including non-enumerable
      Object.entries(endowmentDescriptorsFlat)
        // ignore properties already defined on compartment global
        .filter(([key]) => !(key in rootPackageCompartment.globalThis))
        // ignore circular globalThis refs
        .filter(([key]) => !(globalThisRefs.includes(key)))
        // define property on compartment global
        .forEach(([key, desc]) => {
          // unwrap functions, setters/getters & apply scope proxy workaround
          const wrappedPropDesc = applyEndowmentPropDescTransforms(desc, rootPackageCompartment, globalRef)
          Reflect.defineProperty(rootPackageCompartment.globalThis, key, wrappedPropDesc)
        })
      // global circular references otherwise added by prepareCompartmentGlobalFromConfig
      // Add all circular refs to root package compartment globalThis
      for (const ref of globalThisRefs) {
        if (ref in rootPackageCompartment.globalThis) {
          continue
        }
        rootPackageCompartment.globalThis[ref] = rootPackageCompartment.globalThis
      }

      // save the compartment for use by other modules in the package
      packageCompartmentCache.set(rootPackageName, rootPackageCompartment)

      return rootPackageCompartment
    }

    function getCompartmentForPackage (packageName, packagePolicy) {
      // compartment may have already been created
      let packageCompartment = packageCompartmentCache.get(packageName)
      if (packageCompartment) {
        return packageCompartment
      }

      // prepare Compartment
      if (getExternalCompartment && packagePolicy.env) {
        // external compartment can be provided by the platform (eg lavamoat-node)
        packageCompartment = getExternalCompartment(packageName, packagePolicy)
      } else {
        // prepare the module's SES Compartment
        // endowments:
        // - Math is for untamed Math.random
        // - Date is for untamed Date.now
        packageCompartment = new Compartment({ Math, Date })
      }
      // prepare endowments
      let endowments
      try {
        endowments = getEndowmentsForConfig(
          // source reference
          rootPackageCompartment.globalThis,
          // policy
          packagePolicy,
          // unwrap to
          globalRef,
          // unwrap from
          packageCompartment.globalThis
        )
      } catch (err) {
        const errMsg = `Lavamoat - failed to prepare endowments for package "${packageName}":\n${err.stack}`
        throw new Error(errMsg)
      }

      // transform functions, getters & setters on prop descs. Solves SES scope proxy bug
      Object.entries(Object.getOwnPropertyDescriptors(endowments))
        // ignore non-configurable properties because we are modifying endowments in place
        .filter(([key, propDesc]) => propDesc.configurable)
        .forEach(([key, propDesc]) => {
          const wrappedPropDesc = applyEndowmentPropDescTransforms(propDesc, packageCompartment, rootPackageCompartment.globalThis)
          Reflect.defineProperty(endowments, key, wrappedPropDesc)
        })

      // sets up read/write access as configured
      const globalsConfig = packagePolicy.globals
      prepareCompartmentGlobalFromConfig(packageCompartment, globalsConfig, endowments, globalStore, globalThisRefs)

      // save the compartment for use by other modules in the package
      packageCompartmentCache.set(packageName, packageCompartment)

      return packageCompartment
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

    // util for getting the prototype chain as an array
    // includes the provided value in the result
    function getPrototypeChain (value) {
      const protoChain = []
      let current = value
      while (current && (typeof current === 'object' || typeof current === 'function')) {
        protoChain.push(current)
        current = Reflect.getPrototypeOf(current)
      }
      return protoChain
    }
  }
})()
