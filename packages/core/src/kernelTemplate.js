// LavaMoat Prelude
(function() {

  return createKernel


  function createKernel ({ lavamoatConfig, loadModuleData, getRelativeModuleId, prepareModuleInitializerArgs }) {
    const debugMode = __lavamoatDebugMode__

    // identify the globalRef
    const globalRef = (typeof self !== 'undefined') ? self : global

    // create the SES rootRealm
    // "templateRequire" calls are inlined in "generatePrelude"
    const SES = templateRequire('ses')
    const sesOptions = {
      // this is introduces non-determinism, but is otherwise safe
      mathRandomMode: 'allow',
    }

    // only reveal error stacks in debug mode
    if (debugMode === true) {
      sesOptions.errorStackMode = 'allow'
    }
    const realm = SES.makeSESRootRealm(sesOptions)

    // initialize the kernel
    const createKernelCore = __createKernel__
    const kernel = createKernelCore({
      lavamoatConfig,
      loadModuleData,
      getRelativeModuleId,
      prepareModuleInitializerArgs,
      realm,
      unsafeEvalWithEndowments,
      globalRef,
      debugMode,
    })
    return kernel
  }

  // this performs an unsafeEval in the context of the provided endowments
  function unsafeEvalWithEndowments(code, endowments) {
    with (endowments) {
      return eval(code)
    }
  }

})()
