// LavaMoat Prelude
(function () {
  return createKernel

  function createKernel ({
    lavamoatConfig,
    loadModuleData,
    getRelativeModuleId,
    prepareModuleInitializerArgs,
    getExternalCompartment,
    globalThisRefs,
    runWithPrecompiledModules,
    reportStatsHook,
  }) {
    // debug options are hard-coded at build time
    const {
      debugMode,
    } = __lavamoatDebugOptions__
    // security options are hard-coded at build time
    const {
      scuttleGlobalThis,
      scuttleGlobalThisExceptions,
    } = __lavamoatSecurityOptions__

    function getGlobalRef () {
      if (typeof globalThis !== 'undefined') {
        return globalThis
      }
      const globalRef = typeof self !== 'undefined' ? self : (typeof global !== 'undefined' ? global : undefined)
      if (typeof globalRef !== 'undefined') {
        console.error('LavaMoat - Deprecation Warning: global reference is expected as `globalThis`')
      }
    }

    const globalRef = getGlobalRef()

    if (!globalRef) {
      throw new Error('Lavamoat - globalThis not defined')
    }

    // polyfill globalThis
    if (globalRef.globalThis !== globalRef) {
      globalRef.globalThis = globalRef
    }
    if (globalRef.global !== globalRef) {
      globalRef.global = globalRef
    }

    // create the SES rootRealm
    // "templateRequire" calls are inlined in "generateKernel"
    // load-bearing semi-colon, do not remove
    ;templateRequire('ses')

    const lockdownOptions = {
      // gives a semi-high resolution timer
      dateTaming: 'unsafe',
      // this is introduces non-determinism, but is otherwise safe
      mathTaming: 'unsafe',
      // lets code observe call stack, but easier debuggability
      errorTaming: 'unsafe',
      // shows the full call stack
      stackFiltering: 'verbose',
      // deep stacks
      consoleTaming: 'unsafe',
    }

    lockdown(lockdownOptions)

    // initialize the kernel
    const createKernelCore = __createKernelCore__
    const kernel = createKernelCore({
      lavamoatConfig,
      loadModuleData,
      getRelativeModuleId,
      prepareModuleInitializerArgs,
      getExternalCompartment,
      globalRef,
      globalThisRefs,
      scuttleGlobalThis,
      scuttleGlobalThisExceptions,
      debugMode,
      runWithPrecompiledModules,
      reportStatsHook,
    })
    return kernel
  }
})()
