/// <reference path="../capability-env.d.ts" />
/* global repair, defineCapability */

// Back up globals and intrinsics you may need later.
// If scuttling is enabled, they will be destroyed.
const { defineProperty } = Object

repair((_realGlobalThis) => {
  // repair logic runs between SES repairIntrinsics and the step that freezes intrinsics.
  // you can safely modify intrinsics synchronously in this function.

  _realGlobalThis.Promise.fancyPolyfill = function fancyPolyfill() {}
})

defineCapability('endow-something', {
  ambient: false, // if true, applies to every compartment automatically
  endow: ({
    options, // array of options from the resource's capabilities entry
    endowments, // the proposed endowments object (after getEndowmentsForConfig)
    // compartmentGlobalThis, // the compartment's globalThis
    // rootCompartmentGlobalThis, // the root compartment's globalThis
  }) => {
    endowments[options[0]] = options[1]
  },
})

defineCapability('support-something', {
  ambient: false, // if true, applies to every compartment automatically
  endow: ({
    options, // array of options from the resource's capabilities entry
    // endowments, // the proposed endowments object (after getEndowmentsForConfig)
    compartmentGlobalThis, // the compartment's globalThis
    // rootCompartmentGlobalThis, // the root compartment's globalThis
  }) => {
    defineProperty(compartmentGlobalThis, options[0], {
      value: function customImplementation() {},
      writable: false,
      configurable: false,
      enumerable: true,
    })
  },
})
