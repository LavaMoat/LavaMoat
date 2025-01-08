/**
 * Provides {@link makeExecutionCompartment}, which returns a subclass of
 * {@link Compartment} for use during execution.
 *
 * @packageDocumentation
 */

import { wrapFunctionConstructor } from './function-wrapper.js'

/**
 * @import {SomeGlobalThis, ContextTestFn} from '../internal.js'
 * @import {CompartmentOptions} from 'ses'
 */

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
      super(options)

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

      // XXX: This is 100% absolutely necessary, and we don't yet know why
      Object.defineProperty(NewFunctionCtor, 'prototype', {
        value: OriginalFunctionCtor.prototype,
      })

      compartmentGlobalThis.Function = NewFunctionCtor
    }
  }
}
