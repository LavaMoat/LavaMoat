// import {
//   Proxy,
//   String,
//   TypeError,
//   ReferenceError,
//   create,
//   freeze,
//   getOwnPropertyDescriptors,
//   globalThis,
//   immutableObject,
// } from './commons.js';
const { freeze, create, getOwnPropertyDescriptors } = Object
const immutableObject = freeze(create(null))

// import { assert } from './error/assert.js';
const assert = {
  fail: (msg) => {
    throw new Error(msg)
  },
}

// const { details: d, quote: q } = assert;
const d = (strings, args) => strings.join() + args.join()
const q = (arg) => arg

/**
 * alwaysThrowHandler
 * This is an object that throws if any property is called. It's used as
 * a proxy handler which throws on any trap called.
 * It's made from a proxy with a get trap that throws. It's safe to
 * create one and share it between all Proxy handlers.
 */
const alwaysThrowHandler = new Proxy(
  immutableObject,
  freeze({
    get(_shadow, prop) {
      assert.fail(
        d`Please report unexpected scope handler trap: ${q(String(prop))}`,
      )
    },
  }),
)

/*
 * scopeProxyHandlerProperties
 * scopeTerminatorHandler manages a strictScopeTerminator Proxy which serves as
 * the final scope boundary that will always return "undefined" in order
 * to prevent access to "start compartment globals".
 */
const scopeProxyHandlerProperties = {
  get(_shadow, _prop) {
    return undefined
  },

  set(_shadow, prop, _value) {
    // We should only hit this if the has() hook returned true matches the v8
    // ReferenceError message "Uncaught ReferenceError: xyz is not defined"
    throw new ReferenceError(`${String(prop)} is not defined`)
  },

  has(_shadow, prop) {
    // we must at least return true for all properties on the realm globalThis
    return prop in globalThis
  },

  // note: this is likely a bug of safari
  // https://bugs.webkit.org/show_bug.cgi?id=195534
  getPrototypeOf() {
    return null
  },

  // Chip has seen this happen single stepping under the Chrome/v8 debugger.
  // TODO record how to reliably reproduce, and to test if this fix helps.
  // TODO report as bug to v8 or Chrome, and record issue link here.
  getOwnPropertyDescriptor(_target, prop) {
    // Coerce with `String` in case prop is a symbol.
    const quotedProp = q(String(prop))
    console.warn(
      `getOwnPropertyDescriptor trap on scopeTerminatorHandler for ${quotedProp}`,
      new TypeError().stack,
    )
    return undefined
  },
}

// The scope handler's prototype is a proxy that throws if any trap other
// than get/set/has are run (like getOwnPropertyDescriptors, apply,
// getPrototypeOf).
const strictScopeTerminatorHandler = freeze(
  create(
    alwaysThrowHandler,
    getOwnPropertyDescriptors(scopeProxyHandlerProperties),
  ),
)

const strictScopeTerminator = new Proxy(
  immutableObject,
  strictScopeTerminatorHandler,
)

module.exports = {
  alwaysThrowHandler,
  strictScopeTerminatorHandler,
  strictScopeTerminator,
}
