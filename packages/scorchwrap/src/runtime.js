// lockdown({
//   errorTaming: "unsafe",
//   mathTaming: "unsafe",
//   dateTaming: "unsafe",
//   consoleTaming: "unsafe",
//   stackFiltering: "verbose",
// });
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
      WebAssembly,
    };
  };

  const compartment_ekhm_Map = new Map();

  const wrapRequireWithPolicy = (__webpack_require__, resourceId) =>
    function (pkg) {
      enforcePolicy(pkg, resourceId);
      return __webpack_require__.apply(this, arguments);
    };

  globalThis.getLavaMoatEvalKitForCompartment = (resourceId, runtimeKit) => {
    let overrides = create(null);

    const { __webpack_require__ } = runtimeKit;

    if (__webpack_require__) {
      // wrap webpack runtime for policy check and hardening
      const policyRequire = wrapRequireWithPolicy(
        __webpack_require__,
        resourceId
      );
      policyRequire.n = __webpack_require__.n; // TODO: figure out what to wrap if anything
      policyRequire.r = __webpack_require__.r; // TODO: figure out what to wrap if anything
      policyRequire.d = __webpack_require__.d; // TODO: figure out what to wrap if anything
      overrides.__webpack_require__ = policyRequire;
    }
    const runtimeHandler = freeze(assign(create(null), runtimeKit, overrides));

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
