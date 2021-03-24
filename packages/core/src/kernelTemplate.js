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
  }) {
    const debugMode = __lavamoatDebugMode__

    // identify the globalRef
    const globalRef = (typeof globalThis !== 'undefined') ? globalThis : (typeof self !== 'undefined') ? self : (typeof global !== 'undefined') ? global : undefined
    if (!globalRef) {
      throw new Error('Lavamoat - unable to identify globalRef')
    }

    // polyfill globalThis
    if (globalRef && !globalRef.globalThis) {
      globalRef.globalThis = globalRef
    }

    // create the SES rootRealm
    // "templateRequire" calls are inlined in "generatePrelude"
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
      debugMode
    })
    return kernel
  }
})()
