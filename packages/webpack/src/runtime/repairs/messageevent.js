const { defineProperty } = Object
const { call } = Function.prototype

// TODO:
// - implement wider support for messageable realms matching (parent, top, opener)
// - once other realm reference are emulated, match and return the right references from the getter as well

/**
 * Wraps the source getter on MessageEvent prototype with conversion from actual
 * global to compartment global
 *
 * @param {{ [key: string]: any }} endowments
 * @param {any} theRealGlobalThis
 * @param {any} packageCompartmentGlobal
 */
exports.MessageEvent = (
  endowments,
  theRealGlobalThis,
  packageCompartmentGlobal
) => {
  const original = Object.getOwnPropertyDescriptor(
    endowments['MessageEvent'].prototype,
    'source'
  )
  if (original && original.get) {
    const sourceGetter = call.bind(original.get)
    defineProperty(endowments['MessageEvent'].prototype, 'source', {
      ...original,
      get() {
        const w = sourceGetter(this)
        if (w === theRealGlobalThis) {
          return packageCompartmentGlobal
        } else {
          return w
        }
      },
    })
  }
}
