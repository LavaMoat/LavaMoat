/**
 * Provides {@link makeExecutionCompartment}, which returns a subclass of
 * {@link Compartment} for use during execution.
 *
 * @packageDocumentation
 */

import { endowmentsToolkit } from 'lavamoat-core'
import { createRequire } from 'node:module'
const wrapFunctionConstructor = endowmentsToolkit.defaultCreateFunctionWrapper

/**
 * @import {SomeGlobalThis, ContextTestFn} from '../internal.js'
 * @import {CompartmentOptions} from 'ses'
 */

/**
 *
 *
 * @param {string} _parentModuleSpecifier
 * @param {Record<string, any>} meta
 */
const importMetaHook = (_parentModuleSpecifier, meta) => {
  assert(meta.url, 'meta.url should be provided by endo, but missing')
  /**
   * @param {string} specifier
   * @param {string} [parent]
   * @returns {string}
   */
  meta.resolve = (specifier, parent) => {
    const require = createRequire(parent || meta.url)
    return require.resolve(specifier)
  }
}

/**
 * Creates a subclass of `Compartment` which, when instantiated, applies fixes
 * to its {@link Compartment.globalThis globalThis}.
 *
 * This is intended to be used for execution; the fixes applied here do not
 * affect the behavior of policy generation.
 *
 * @param {SomeGlobalThis} originalGlobalThis Needed to provide a real
 *   {@link Math} and {@link Date}
 * @returns {typeof Compartment}
 * @internal
 */
export const makeExecutionCompartment = (originalGlobalThis) => {
  return class ExecutionCompartment extends Compartment {
    /**
     * @param {CompartmentOptions} [options]
     */
    constructor(options) {
      super({ ...options, noAggregateLoadErrors: true, importMetaHook })

      const { globalThis: compartmentGlobalThis } = this

      // provide a working Date and Math to be nice.
      compartmentGlobalThis.Date = originalGlobalThis.Date
      compartmentGlobalThis.Math = originalGlobalThis.Math

      /** @type {FunctionConstructor} */
      const OriginalFunctionCtor = compartmentGlobalThis.Function

      /**
       * Replacement for `Function` constructor.
       *
       * @privateRemarks
       * A function declaration cannot be used with a type assertion, and we
       * need to use a type assertion here.
       */
      // eslint-disable-next-line func-style
      const NewFunctionCtor = /** @type {typeof OriginalFunctionCtor} */ (
        function (...args) {
          const fn = OriginalFunctionCtor(...args)

          /** @type {ContextTestFn} */
          const unwrapTest = (thisValue) => thisValue === undefined

          return wrapFunctionConstructor(fn, unwrapTest, compartmentGlobalThis)
        }
      )

      // W're replacing the Function global, but want to prevent
      // identity discontinuity on functions between compartments,
      // so the prototype must match
      Object.defineProperty(NewFunctionCtor, 'prototype', {
        value: OriginalFunctionCtor.prototype,
      })

      compartmentGlobalThis.Function = NewFunctionCtor
    }
  }
}
