/// <reference path="./lavamoat.d.ts" />
/* global LAVAMOAT */

const { create, assign, freeze, defineProperty } = Object
const warn = typeof console === 'object' ? console.warn : () => {}
warn('LavaMoat: using unlocked runtime')

const { NAME_globalThis, NAME_scopeTerminator, NAME_runtimeHandler } =
  LAVAMOAT.ENUM

/**
 * Wraps the webpack runtime with Lavamoat security features.
 *
 * @param {string} resourceId - The identifier of the resource.
 * @param {object} runtimeKit - The runtime kit containing bits from the webpack
 *   runtime.
 * @param {any} [runtimeKit.__webpack_require__] - The webpack require function.
 * @param {object} [runtimeKit.module] - The module object.
 * @param {any} [runtimeKit.exports] - The exports object.
 * @returns {{
 *   [NAME_scopeTerminator]: Object
 *   [NAME_runtimeHandler]: Object
 *   [NAME_globalThis]: Object
 * }}
 *   An object containing:
 *
 *   - [NAME_scopeTerminator]: nothing
 *   - [NAME_runtimeHandler]: The frozen runtime handler, unchanged
 *   - [NAME_globalThis]: unprotected globals
 */
const lavamoatRuntimeWrapper = (resourceId, runtimeKit) => {
  let { module } = runtimeKit
  const runtimeHandler = assign(create(null), runtimeKit)

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

  return freeze(
    assign(create(null), {
      [NAME_scopeTerminator]: create(null),
      [NAME_runtimeHandler]: runtimeHandler,
      [NAME_globalThis]: globalThis, // TODO: apply some defensive coding to the global here to give at least some benefits to the user
    })
  )
}

// defaultExport is getting assigned to __webpack_require__._LM_
LAVAMOAT.defaultExport = freeze(lavamoatRuntimeWrapper)
