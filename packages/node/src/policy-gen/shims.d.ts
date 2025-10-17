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
