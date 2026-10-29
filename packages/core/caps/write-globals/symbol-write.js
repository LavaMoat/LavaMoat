/// <reference path="../capability-env.d.ts" />
/* global defineCapability */

const { defineProperty } = Object

const { for: symbolFor } = Symbol

defineCapability('endow-symbol-write', {
  ambient: false,
  endow: ({
    options,
    _endowments,
    compartmentGlobalThis,
    rootCompartmentGlobalThis,
  }) => {
    for (const key of options) {
      const sym = symbolFor(key)
      defineProperty(compartmentGlobalThis, sym, {
        get() {
          return rootCompartmentGlobalThis[sym]
        },
        set(value) {
          rootCompartmentGlobalThis[sym] = value
        },
        configurable: true,
        enumerable: true,
      })
    }
  },
})

defineCapability('endow-symbol-read', {
  ambient: false,
  endow: ({
    options,
    _endowments,
    compartmentGlobalThis,
    rootCompartmentGlobalThis,
  }) => {
    for (const key of options) {
      const sym = symbolFor(key)
      defineProperty(compartmentGlobalThis, sym, {
        get() {
          return rootCompartmentGlobalThis[sym]
        },
        writable: false,
        configurable: true,
        enumerable: true,
      })
    }
  },
})
