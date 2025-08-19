/**
 * Additionally hardens the intrinsics as properties on globalThis on top of
 * what lockdown() already did. Ideas inherited from lockdown-more in MetaMask.
 *
 * @param {any} globalThis
 */
exports.harden = (globalThis) => {
  const Compartment = globalThis.Compartment
  const namedIntrinsics = Reflect.ownKeys(new Compartment().globalThis)

  for (const propertyName of namedIntrinsics) {
    const descriptor = Reflect.getOwnPropertyDescriptor(
      globalThis,
      propertyName
    )

    if (descriptor) {
      if (descriptor.configurable) {
        // If the property on globalThis is configurable, make it
        // non-configurable. If it has no accessor properties, also make it
        // non-writable.
        if (hasAccessor(descriptor)) {
          Object.defineProperty(globalThis, propertyName, {
            configurable: false,
          })
        } else {
          Object.defineProperty(globalThis, propertyName, {
            configurable: false,
            writable: false,
          })
        }
      }
    }
  }
}

/**
 * Checks if the property descriptor has an accessor (getter or setter).
 *
 * @param {PropertyDescriptor} descriptor - The property descriptor to check.
 * @returns {boolean} True if the descriptor has an accessor, false otherwise.
 */
function hasAccessor(descriptor) {
  return 'set' in descriptor || 'get' in descriptor
}
