const { defineProperty } = Object
const { call } = Function.prototype

const messageToGlobalMap = new WeakMap()
const theRealGlobalThis = globalThis
// TODO: enabe after further testing:
// const realms = new Map()
// realms.set(globalThis.top || {}, 'top')
// realms.set(globalThis.parent || {}, 'parent')
// realms.set(globalThis.opener || {}, 'opener')

const mep = MessageEvent.prototype
// eslint-disable-next-line no-undef
const lastResortGlobal = new Compartment().globalThis

const original = Object.getOwnPropertyDescriptor(mep, 'source')
if (original && original.get) {
  const sourceGetter = call.bind(original.get)

  defineProperty(mep, 'source', {
    ...original,
    get() {
      const w = sourceGetter(this)
      if (w === theRealGlobalThis) {
        return messageToGlobalMap.get(this) || lastResortGlobal
        // } else if (w && typeof w === 'object' && realms.has(w)) {
        //   return messageToGlobalMap.get(this)[realms.get(w)] || lastResortGlobal
      } else {
        return w
      }
    },
    // left configurable because replacing it with original is impossible after and we 
    // want to allow further wrapping (eg by Snow)
  })
}

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
  const originalConstructor = endowments.MessageEvent
  if (!originalConstructor) {
    return
  }

  /**
   * @param {string} type
   * @param {any} eventInitDict
   */
  endowments.MessageEvent = function MessageEvent(type, eventInitDict) {
    const nestedResult = new originalConstructor(type, eventInitDict)
    messageToGlobalMap.set(nestedResult, packageCompartmentGlobal)
    return nestedResult
  }
  endowments.MessageEvent.prototype = originalConstructor.prototype
  // WARNING: fidelity breaks down at MessageEvent.prototype.constructor,
  // which runs the original constructor and does not pin the resulting object
  // to a matching global in the WeakMap
}
/**
 * Wraps the source getter on MessageEvent prototype with conversion from actual
 * global to compartment global
 *
 * @param {{ [key: string]: any }} endowments
 * @param {any} theRealGlobalThis
 * @param {any} packageCompartmentGlobal
 */
exports.addEventListener = (
  endowments,
  theRealGlobalThis,
  packageCompartmentGlobal
) => {
  const originalListener = endowments.addEventListener
  if (!originalListener) {
    return
  }
  /**
   * @param {string} type
   * @param {(event: MessageEvent) => void} listener
   * @param {any} [options]
   */
  endowments.addEventListener = (type, listener, options) => {
    if (type === 'message') {
      /** @type {typeof listener} */
      const wrappedListener = (event) => {
        messageToGlobalMap.set(event, packageCompartmentGlobal)
        return listener.call(packageCompartmentGlobal, event)
      }
      return originalListener.call(
        theRealGlobalThis,
        type,
        wrappedListener,
        options
      )
    } else {
      // calling it on actual global will work even if it was wrapped for endowments
      return originalListener.call(
        packageCompartmentGlobal,
        type,
        listener,
        options
      )
    }
  }
}
