(function(){

  // templateRequire needs a `globalRef` handle, for now
  const globalRef = globalThis
  const { lockdown } = templateRequire('ses')
    
  const lockdownOptions = {
    // this is introduces non-determinism, but is otherwise safe
    noTameMath: true,
  }

  // only reveal error stacks in debug mode
  // if (debugMode === true) {
  if (true) {
    lockdownOptions.noTameError = true
  }

  lockdown(lockdownOptions)


  return createKernel

  function createKernel ({ debugMode, lavamoatConfig, importHook }) {
    const { OdenKernel } = templateRequire('oden')
    const { getEndowmentsForConfig, makeMinimalViewOfRef } = templateRequire('makeGetEndowmentsForConfig')()
    const { prepareCompartmentGlobalFromConfig } = templateRequire('makePrepareRealmGlobalFromConfig')()
    const { Membrane } = templateRequire('cytoplasm')
    const createReadOnlyDistortion = templateRequire('cytoplasm/distortions/readOnly')

    // setup lavamoat kernel internal state
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

    // create base runtime (to be replaced with endo)
    const lavamoatKernel = new OdenKernel({
      // hooks:
      // async hook for loading a moduleId into the cache
      loadModuleHook: importHook,
      // setting up a compartment (e.g. modifying globals)
      configureCompartmentHook,
      // allows overriding of imports when relative (e.g. subset or wrapper)
      importRelativeHook,
      // called after moduleInitialization completes
      postExecutionHook,
    })

    // return lavamoatKernel
    // backwards compat interface (wip)
    return {
      internalRequire: (moduleId) => {
        lavamoatKernel.entryModules = [moduleId]
        lavamoatKernel.execute()
      },
      membrane,
    }

    function configureCompartmentHook (moduleRecord, moduleCompartment) {
      const { packageName } = moduleRecord
      const isRootModule = packageName === '<root>'
      const configForModule = getConfigForPackage(lavamoatConfig, packageName)

      // add module's lavamoat config to module record 
      moduleRecord.config = configForModule

      // prepare endowments
      let endowments
      if (isRootModule) {
        endowments = globalThis
      } else {
        const endowmentsFromConfig = getEndowmentsForConfig(globalThis, configForModule)
        endowments = { ...endowmentsFromConfig }
      }
      // prepare the membrane-wrapped endowments
      const moduleMembraneSpace = getMembraneSpaceForModule(moduleRecord)
      const endowmentsMembraneSpace = getMembraneSpaceByName('<endowments>')
      const membraneWrappedEndowments = membrane.bridge(endowments, endowmentsMembraneSpace, moduleMembraneSpace)

      // apply endowments to compartment global
      if (isRootModule) {
        // expose all of globalThis, though currently does not support global writes
        // copy every property on globalThis to compartment global without overriding
        // take every property on globalThis
        Object.entries(Object.getOwnPropertyDescriptors(membraneWrappedEndowments))
          // ignore properties already defined on compartment global
          .filter(([key]) => !(key in moduleCompartment.global))
          // define property on compartment global
          .forEach(([key, propDesc]) => Reflect.defineProperty(moduleCompartment.global, key, propDesc))
      } else {
        // sets up read/write access as configured
        const globalsConfig = configForModule.globals
        prepareCompartmentGlobalFromConfig(moduleCompartment.global, globalsConfig, membraneWrappedEndowments, globalStore)
      }
      // expose membrane for debugging
      if (debugMode) {
        moduleCompartment.global.membrane = membrane
      }
    }

    function postExecutionHook (moduleRecord) {
      // configure membrane defense
      // defense is configured here but must be applied elsewhere via membrane bridge
      // set moduleExports graph to read-only
      const moduleExports = moduleRecord.exports
      const moduleMembraneSpace = getMembraneSpaceForModule(moduleRecord)
      deepWalk(moduleExports, (value) => {
        // skip plain values
        if (membrane.shouldSkipBridge(value)) return
        // set this ref to read-only
        moduleMembraneSpace.handlerForRef.set(value, createReadOnlyDistortion({
          setHandlerForRef: (ref, newHandler) => moduleMembraneSpace.handlerForRef.set(ref, newHandler)
        }))
      })
    }

    function importRelativeHook (parentModuleRecord, childModuleRecord) {
      // parent module info
      const parentModulePackageName = parentModuleRecord.packageName
      const parentPackageConfig = parentModuleRecord.config
      const parentPackagesWhitelist = parentPackageConfig.packages
      const parentBuiltinsWhitelist = Object.entries(parentPackageConfig.builtin)
      .filter(([_, allowed]) => allowed === true)
      .map(([packagePath, allowed]) => packagePath.split('.')[0])

      // look up config for module
      const { packageName } = childModuleRecord

      // disallow requiring packages that are not in the parent's whitelist
      const isSamePackage = packageName === parentModulePackageName
      const parentIsRootModule = parentModulePackageName === '<root>'
      const childModuleIsBuiltin = childModuleRecord.type === 'builtin'

      let isInParentWhitelist = false
      if (childModuleIsBuiltin) {
        isInParentWhitelist = parentBuiltinsWhitelist.includes(packageName)
      } else {
        isInParentWhitelist = (parentPackagesWhitelist[packageName] === true)
      }

      // TODO: this is applied after potential side effects
      if (!parentIsRootModule && !isSamePackage && !isInParentWhitelist) {
        throw new Error(`LavaMoat - required package not in whitelist: package "${parentModulePackageName}" requested "${packageName}" as "${requestedName}"`)
      }

      // apply moduleExports require-time protection
      let moduleExports = childModuleRecord.exports

      const isSameMembraneSpace = parentModulePackageName && getMembraneSpaceNameForModule(childModuleRecord) === getMembraneSpaceNameForModule(parentModuleRecord)
      const needsMembraneProtection = !isSameMembraneSpace
      if (needsMembraneProtection) {
        // apply membrane protections
        const inGraph = getMembraneSpaceForModule(childModuleRecord)
        const outGraph = getMembraneSpaceForModule(parentModuleRecord)
        moduleExports = membrane.bridge(childModuleRecord.exports, inGraph, outGraph)
      }

      const moduleId = childModuleRecord.specifier
      const builtinPathFullySelected = childModuleIsBuiltin && parentPackageConfig.builtin[moduleId] === true
      if (!parentIsRootModule && childModuleIsBuiltin && !builtinPathFullySelected) {
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

      return moduleExports
    }

    // this gets the lavaMoat config for a module by packageName
    // if there were global defaults (e.g. everything gets "console") they could be applied here
    function getConfigForPackage (config, packageName) {
      const packageConfig = (config.resources || {})[packageName] || {}
      packageConfig.globals = packageConfig.globals || {}
      packageConfig.packages = packageConfig.packages || {}
      packageConfig.builtin = packageConfig.builtin || {}
      return packageConfig
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

    function getMembraneSpaceForModule (moduleRecord) {
      const spaceName = getMembraneSpaceNameForModule(moduleRecord)
      return getMembraneSpaceByName(spaceName)
    }

    function getMembraneSpaceNameForModule (moduleRecord) {
      const { packageName, type } = moduleRecord
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

  }

})()