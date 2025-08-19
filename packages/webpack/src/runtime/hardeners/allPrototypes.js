const { freeze, defineProperty, getOwnPropertyDescriptor } = Object
/**
 * Harden every prototype found on a global
 *
 * @param {any} globalThis
 */
exports.harden = (globalThis) => {
  const protoOwners = Reflect.ownKeys(globalThis).filter(
    (key) => typeof globalThis[key] === 'object' && globalThis[key].prototype
  )

  for (const propertyName of protoOwners) {
    const desc = getOwnPropertyDescriptor(globalThis[propertyName], 'prototype')
    if (desc && desc.configurable) {
      freeze(globalThis[propertyName].prototype)
      defineProperty(globalThis[propertyName], 'prototype', {
        configurable: false,
        writable: false,
      })
    }
  }
}
