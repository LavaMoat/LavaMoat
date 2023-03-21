(function () {
  const { freeze } = Object;
  // This is a crude mock of SES Compartment
  const Compartment = (endowments) =>
    freeze({
      globalThis: endowments,
    });
  // this would come from SES too
  const scopeTerminator = new Proxy(
    {},
    {
      has: () => true,
    }
  );

  // Policy implementation
  const enforcePolicy = (pkg, resourcePath) => {
    // I could throw
  };
  const getGlobalsForPolicy = (resourcePath) => {
    // I could return a subset of globals
    return {
      console,
    };
  };

  const compartment_ekhm_Map = new Map();

  globalThis.getLavaMoatEvalKitForCompartment = function (
    resourcePath,
    { module, __webpack_require__ }
  ) {
    // TODO: wrap webpack runtime for policy check and hardening
    const runtimeHandler = {
      module,
      __webpack_require__: function (pkg) {
        enforcePolicy(pkg, resourcePath);
        return __webpack_require__.apply(this, arguments);
      },
    };

    if (!compartment_ekhm_Map.has(resourcePath)) {
      // Create a compartment with globals attenuated according to the policy
      // this would come from SES
      compartment_ekhm_Map.set(
        resourcePath,
        Compartment(getGlobalsForPolicy(resourcePath))
      );
    }

    return {
      scopeTerminator,
      runtimeHandler,
      globalThis: compartment_ekhm_Map.get(resourcePath).globalThis,
    };
  };
})();
