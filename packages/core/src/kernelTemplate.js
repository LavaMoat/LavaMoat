// LavaMoat Prelude
(function() {

  return createKernel


  function createKernel ({ lavamoatConfig, loadModuleData, getRelativeModuleId, prepareModuleInitializerArgs }) {
    const debugMode = __lavamoatDebugMode__

    // identify the globalRef
    const globalRef = (typeof globalThis !== 'undefined') ? globalThis : (typeof self !== 'undefined') ? self : global

    // create the SES rootRealm
    // "templateRequire" calls are inlined in "generatePrelude"
    const { lockdown } = templateRequire('ses')
    const lockdownOptions = {
      // this is introduces non-determinism, but is otherwise safe
      noTameMath: true,
    }

    // only reveal error stacks in debug mode
    if (debugMode === true) {
      lockdownOptions.noTameError = true
    }

    lockdown(lockdownOptions)

    // initialize the kernel
    const createKernelCore = __createKernelCore__
    const kernel = createKernelCore({
      lavamoatConfig,
      loadModuleData,
      getRelativeModuleId,
      prepareModuleInitializerArgs,
      globalRef,
      debugMode,
    })
    return kernel
  }

})()
