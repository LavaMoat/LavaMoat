/**
 * Contains types for packages `set.prototype.issubsetof` and
 * `set.prototype.difference` corresponding to shims for ES2024 `Set` methods.
 *
 * @packageDocumentation
 */

declare module 'set.prototype.issubsetof' {
  function implementation<T>(
    this: void,
    set: ReadonlySet<T>,
    other: ReadonlySetLike<unknown>
  ): boolean
  export default implementation
}

declare module 'set.prototype.difference' {
  function implementation<T, U>(
    this: void,
    set: ReadonlySet<T>,
    other: ReadonlySetLike<U>
  ): Set<T>
  export default implementation
}
