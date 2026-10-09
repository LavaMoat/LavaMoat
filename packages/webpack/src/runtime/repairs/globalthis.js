const { getOwnPropertyNames } = Object

/**
 * Util for getting the prototype chain as an array includes the provided value
 * in the result
 *
 * @param {any} value
 * @returns {any[]}
 */
function getPrototypeChain(value) {
  const protoChain = []
  let current = value
  while (
    current &&
    (typeof current === 'object' || typeof current === 'function')
  ) {
    protoChain.push(current)
    current = Reflect.getPrototypeOf(current)
  }
  return protoChain
}
/**
 * For odd sandboxing situations including Firefox contentscript environment,
 * where the globalThis is a sandbox with a truncated prototype chain that
 * magically inherits properties from a hidden part of the prototype chain.
 *
 * The globalRef is casted as a record because I don't want to add 10 extra
 * lines of code to appease typescript
 *
 * @param {Record<string, any>} globalRef
 */
function elevateSecretPrototype(globalRef) {
  if (
    'window' in globalRef &&
    typeof globalRef.window === 'object' &&
    globalRef !== globalRef.window
  ) {
    const win = globalRef.window
    const windowProtoChain = getPrototypeChain(win)
    const globalProtoChain = getPrototypeChain(globalRef)
    windowProtoChain.pop() // remove Object.prototype
    // consider all properties on the prototype chain of window
    // that are defined on window, but not on globalThis
    const considerKeys = windowProtoChain.flatMap((proto) =>
      getOwnPropertyNames(proto)
    )

    const globalKeys = new Set(
      globalProtoChain.flatMap((proto) => getOwnPropertyNames(proto))
    )

    for (const key of considerKeys) {
      // this condition looks self-contradictory, but it's actually explicitly testing for fields that are reachable on globalRef by explicit lookup but cannot be discovered as own properties on the prototype chain items.
      if (
        !globalKeys.has(key) &&
        key in globalThis &&
        typeof win[key] !== 'undefined'
      ) {
        try {
          // Make a property that exists on the hidden prototype chain an own property of globalThis so that the regular logic of copying globals can find it.
          // The try-catch exists to avoid errors if a property is a getter-setter pair that we didn't know existed.
          // eslint-disable-next-line no-self-assign
          globalRef[key] = globalRef[key]
        } catch {}
      }
    }
  }
  return globalRef
}

elevateSecretPrototype(globalThis)

// -------
;(function () {
  const { getOwnPropertyDescriptor, defineProperty, defineProperties } = Object
  const { construct } = Reflect

  /**
   * Replace one host text codec constructor, if present, with a SES-owned
   * constructor that delegates construction to the captured host original and
   * shares the host prototype.
   *
   * @param {'TextEncoder' | 'TextDecoder'} name
   */
  const tameTextCodec = (name) => {
    const NativeCodec = globalThis[name]

    const nativePrototype = NativeCodec.prototype

    const SharedCodec = function TextCodec() {
      // eslint-disable-next-line prefer-rest-params
      return construct(NativeCodec, arguments, new.target)
    }

    defineProperties(SharedCodec, {
      name: { value: name },
      prototype: {
        value: nativePrototype,
        writable: false,
        enumerable: false,
        configurable: false,
      },
    })

    /* Point the shared prototype's `constructor` back at the replacement, so
     the host constructor object is unreachable from the permitted
     intrinsics graph.    */
    defineProperties(nativePrototype, {
      constructor: { value: SharedCodec },
    })

    /* Replace the global binding, so both the start compartment and the
       intrinsics sampling pass observe only the replacement. */
    defineProperty(globalThis, name, {
      value: SharedCodec,
      writable: true,
      enumerable: false,
      configurable: true,
    })
  }

  if (
    'TextEncoder' in globalThis &&
    getOwnPropertyDescriptor(globalThis.TextEncoder, 'arguments')
  ) {
    tameTextCodec('TextEncoder')
    tameTextCodec('TextDecoder')
  }
})()
