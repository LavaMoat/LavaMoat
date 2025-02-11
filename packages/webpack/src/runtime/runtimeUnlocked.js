/// <reference path="./lavamoat.d.ts" />
/* global LAVAMOAT */

const { create, freeze, defineProperty } = Object
const warn = typeof console === 'object' ? console.warn : () => {}
warn('LavaMoat: using unlocked runtime')

const { NAME_globalThis, NAME_scopeTerminator, NAME_runtimeHandler } =
  LAVAMOAT.ENUM

/**
 * Wraps the webpack runtime with Lavamoat security features.
 *
 * @param {string} resourceId - The identifier of the resource.
 * @param {any} runtimeKit - The runtime kit containing bits from the webpack
 *   runtime.
 * @returns {Object} - An object containing the wrapped runtime and other
 *   related properties.
 */
const lavamoatRuntimeWrapper = (resourceId, runtimeKit) => {
  let { module } = runtimeKit
  const runtimeHandler = runtimeKit

  // allow setting, but ignore value for /* module decorator */ module = __webpack_require__.nmd(module)
  defineProperty(runtimeHandler, 'module', {
    get: () => module,
    set: () => {},
  })
  // Make it possible to overwrite `exports` locally despite runtimeHandler being frozen
  let exportsReference = runtimeHandler.exports
  defineProperty(runtimeHandler, 'exports', {
    get: () => exportsReference,
    set: (value) => {
      exportsReference = value
    },
  })
  freeze(runtimeHandler)

  return {
    [NAME_scopeTerminator]: create(null),
    [NAME_runtimeHandler]: runtimeHandler,
    [NAME_globalThis]: globalThis, // TODO: apply some defensive coding to the global here to give at least some benefits to the user
  }
}

// defaultExport is getting assigned to __webpack_require__._LM_
LAVAMOAT.defaultExport = freeze(lavamoatRuntimeWrapper)
