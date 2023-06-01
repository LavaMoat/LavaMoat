const { create, freeze, assign, defineProperty } = Object;

// SES is added to the page, but not when fragments of the bundle are running during compilation.
// Some plugins, like CSS extractors, are running code from the bundle at compile time and need not to fail here.
// Avoid running any wrapped code or using compartment if lockdown was not called.
const LOCKDOWN_ON = (typeof lockdown !== "undefined");
if (LOCKDOWN_ON) {
  lockdown(LAVAMOAT.options.lockdown);
} else {
  console && console.warn('LavaMoat: not executing, SES is missing.');
}

// These must match assumptions in the wrapper.js
// TODO: drill them down from options
const NAME_globalThis = "G";
const NAME_scopeTerminator = "ST";
const NAME_runtimeHandler = "RH";

// strictScopeTerminator from SES is not strict enough - `has` would only return true for globals
// and here we want to prevent reaching into the scope where local variables from bundle runtime are available.
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

const lavamoatRuntimeWrapper = (resourceId, runtimeKit) => {
  if(!LOCKDOWN_ON) {
    return create(null);
  }
  let overrides = create(null);

  // modules may reference `require` dynamically, but that's something we don't want to allow
  const { __webpack_require__ } = runtimeKit;
  let { module } = runtimeKit;

  if (__webpack_require__) {
    // wrap webpack runtime for policy check and hardening
    const policyRequire = wrapRequireWithPolicy(
      __webpack_require__,
      resourceId
    );

    // TODO: figure out what to wrap if anything
    // Some of these may have to be limited, probably by configurationn
    assign(policyRequire, __webpack_require__);

    // override webpack_require functionalities
    policyRequire.nmd = (moduleReference) => {
      if (moduleReference === module) {
        module = __webpack_require__.nmd(module);
      }
    };
    overrides.__webpack_require__ = policyRequire;
  }
  const runtimeHandler = assign(create(null), runtimeKit, overrides);

  // allow setting, but ignore value for /* module decorator */ module = __webpack_require__.nmd(module);
  defineProperty(runtimeHandler, "module", {
    get: () => module,
    set: () => {},
  });
  freeze(runtimeHandler);

  if (!compartment_ekhm_Map.has(resourceId)) {
    // Create a compartment with globals attenuated according to the policy
    compartment_ekhm_Map.set(
      resourceId,
      new Compartment(getGlobalsForPolicy(resourceId))
    );
  }

  return {
    [NAME_scopeTerminator]: stricterScopeTerminator,
    [NAME_runtimeHandler]: runtimeHandler,
    [NAME_globalThis]: compartment_ekhm_Map.get(resourceId).globalThis,
  };
};

LAVAMOAT.E = freeze(lavamoatRuntimeWrapper);