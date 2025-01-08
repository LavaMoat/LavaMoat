/**
 * Provides {@link wrapFunctionConstructor} which ensures a function is called
 * with a specific context.
 *
 * @packageDocumentation
 * @internal
 */

/**
 * @import {SomeFunction, ContextTestFn, SomeParameters} from '../internal.js';
 */

/**
 * Wraps a function so that it has a proper context object.
 *
 * The motivation is that some functions in `globalThis` must be called with the
 * `globalThis` object as context. This detects such functions and wraps them
 * such that they are called with the correct context.
 *
 * Supports constructors (e.g., {@link FunctionConstructor}).
 *
 * @template {SomeFunction} [T=SomeFunction] Function to wrap. Can be a
 *   constructor. Default is `SomeFunction`
 * @template {object} [U=object] Context to use, if necessary. Default is
 *   `object`
 * @param {T} sourceValue Function to wrap
 * @param {ContextTestFn} unwrapTest Test to determine context; if true will use
 *   `unwrapTo` as `this`
 * @param {U} unwrapTo Some object (usually a `globalThis`)
 * @returns {T} Wrapped function
 */
export function wrapFunctionConstructor(sourceValue, unwrapTest, unwrapTo) {
  /**
   * @param {SomeParameters<T>} args
   * @returns {ReturnType<T>}
   * @this {U | Record<PropertyKey, any>}
   */
  // eslint-disable-next-line func-style
  const newValue = function (...args) {
    if (new.target) {
      // handle constructor calls
      return Reflect.construct(sourceValue, args, new.target)
    } else {
      // handle function calls
      // unwrap to target value if this value is the source package compartment's globalThis
      const thisRef = unwrapTest(this) ? unwrapTo : this
      return Reflect.apply(sourceValue, thisRef, args)
    }
  }

  // TODO: can we copy _only_ the prototype?
  Object.defineProperties(
    newValue,
    Object.getOwnPropertyDescriptors(sourceValue)
  )
  return /** @type {T} */ (newValue)
}
