lockdown({
  errorTaming: "unsafe",
  mathTaming: "unsafe",
  dateTaming: "unsafe",
  consoleTaming: "unsafe",
  stackFiltering: "verbose",
});
(function () {
  const { create, freeze, assign } = Object;
  // strictScopeTerminator from SES is not strict enough - `has` would only return true for globals and here we want to prevent reaching into the scope where local variables from bundle runtime are available.
  const stricterScopeTerminator = freeze(
    new Proxy(
      freeze(create(null)),
      freeze({
        has: freeze(() => true),
      })
    )
  );

  // Policy implementation
  // This part would require bundling a subset of the core runtime 
  const enforcePolicy = (pkg, resourceId) => {
    // I could throw
  };
  const getGlobalsForPolicy = (resourceId) => {
    // I could return a subset of globals
    return {
      console,
    };
  };

  const compartment_ekhm_Map = new Map();

  globalThis.getLavaMoatEvalKitForCompartment = (
    resourceId,
    runtimeKit
  ) => {
    const { __webpack_require__ } = runtimeKit;
    // wrap webpack runtime for policy check and hardening
    const runtimeHandler = freeze(
      assign(create(null), runtimeKit, {
        __webpack_require__: freeze(function (pkg) {
          enforcePolicy(pkg, resourceId);
          return __webpack_require__.apply(this, arguments);
        }),
      })
    );

    if (!compartment_ekhm_Map.has(resourceId)) {
      // Create a compartment with globals attenuated according to the policy
      compartment_ekhm_Map.set(
        resourceId,
        new Compartment(getGlobalsForPolicy(resourceId))
      );
    }

    return {
      scopeTerminator: stricterScopeTerminator,
      runtimeHandler,
      globalThis: compartment_ekhm_Map.get(resourceId).globalThis,
    };
  };
})();
