'use strict'

const DEBUG = global.DEBUG = new Map()

module.exports = createShadowingProxy

function createShadowingProxy (target, parentProxy) {
  // // return bare value if it cannot be proxied
  // if (target === null) return target
  // if (!['function', 'object'].includes(typeof target)) return target

  // const deletes = new Set()
  // const overwrites = {}
  // // const proxyTarget = typeof target === 'function' ? proxyFn : target
  // const proxyTarget = target
  // const proxy = new Proxy(proxyTarget, {

  //   //
  //   // accesses
  //   //

  //   has (_, key) {
  //     // console.log({  has: { key } })
  //     if (deletes.has(key)) {
  //       return false
  //     }
  //     if (key in overwrites) {
  //       return true
  //     }
  //     return Reflect.has(proxyTarget, key)
  //   },
  //   ownKeys: (...args) => {
  //     const keys = Reflect.ownKeys(proxyTarget, ...args)
  //     const undeleted = keys.filter(key => !deletes.has(key))
  //     const overwriteKeys = Object.keys(overwrites)
  //     const uniq = new Set([].concat(overwriteKeys, undeleted))
  //     const result = Array.from(uniq)
  //     // console.log(' ownKeys', result)
  //     return result
  //   },
  //   get (_, key) {
  //     console.log({  get: { key } })
      
  //     if (deletes.has(key)) {
  //       return
  //     }
  //     // if value in overwrites, simply return that
  //     if (key in overwrites) {
  //       return overwrites[key]
  //     }
  //     // return original value in proxy
  //     const value = target[key]
  //     // console.log(' key', key)
  //     if (![Symbol.for('nodejs.util.inspect.custom'), Symbol.toPrimitive, Symbol.toStringTag, Symbol.iterator, 'toString', 'inspect'].includes(key)) {
  //       console.log(' get - createShadowingProxy', value, proxy)
  //     } else {
  //       console.log(' get - createShadowingProxy')
  //     }
  //     return createShadowingProxy(value, proxy)
  //   },
  //   getPrototypeOf: (...args) => {
  //     const result = Reflect.getPrototypeOf(...args)
  //     // console.log(' getPrototypeOf', args, result)
  //     return result
  //   },
  //   isExtensible: (...args) => {
  //     const result = Reflect.isExtensible(...args)
  //     // console.log(' isExtensible', args, result)
  //     return result
  //   },
  //   getOwnPropertyDescriptor: (...args) => {
  //     const result = Reflect.getOwnPropertyDescriptor(...args)
  //     // console.log(' getOwnPropertyDescriptor', args, result)
  //     return result
  //   },
  //   construct: (target, args) => {
  //     const result = Reflect.construct(proxyTarget, args)
  //     console.log(' construct', args, result)
  //     return createShadowingProxy(result)
  //   },
  //   apply (target, thisArg, args) {
  //     // call with protected 'this'
  //     console.log(' apply', { target, thisArg, args })
  //     // thisArg = createShadowingProxy(thisArg)
  //     let returnValue = Reflect.apply(target, parentProxy, args)

  //     console.log(' apply Reflect', target, parentProxy, args)
  //     console.log(' apply - createShadowingProxy', returnValue, parentProxy)
  //     return createShadowingProxy(returnValue, parentProxy)
  //   },

  //   //
  //   // modifications
  //   //

  //   set (_, key, value) {
  //     // console.log({  set: { key, value } })
  //     overwrites[key] = value
  //     return true
  //   },
  //   setPrototypeOf: function(...args) {
  //     // console.log(' setPrototypeOf', args)
  //     throwReadOnlyError()
  //   },
  //   preventExtensions: function(...args) {
  //     // console.log(' preventExtensions', args)
  //     throwReadOnlyError()
  //   },
  //   defineProperty: function(...args) {
  //     // console.log(' defineProperty', args)
  //     throwReadOnlyError()
  //   },
  //   deleteProperty (_, key) {
  //     // console.log({  delete: { key } })
  //     // overwrites[key] = undefined
  //     delete overwrites[key]
  //     deletes.add(key)
  //   },

  // })

  // return proxy
  
  // // function proxyFn (...args) {
  // //   if (new.target) {
  // //     return Reflect.construct(target, args, new.target)
  // //   } else {
  // //     console.log(' proxyFn', target, parentProxy)
  // //     return Reflect.apply(target, parentProxy, args)
  // //   }
  // // }

  // function throwReadOnlyError () {
  //   throw Error('Protected object is read-only')
  // }
  DEBUG[target] = 'root'
  // return protect(target)
  return protect2(target)

}

// function protect (proxyTarget, parentProxy) {

//   // primitives get passed through
//   if (Object(proxyTarget) !== proxyTarget) {
//     return proxyTarget
//   }

//   const overwrites = {}
//   const deletes = new Set()

//   const proxy = new Proxy(proxyTarget, {
//     // accesses
//     get: (target, key, receiver) => {
//       const keyString = key.toString()
//       if (key in overwrites) {
//         console.log(' get overwrites hit', `${DEBUG[target]}.${keyString}`)
//         return overwrites[key]
//       }
//       console.log(' get overwrites miss', `${DEBUG[target]}.${keyString}`)
//       const result = Reflect.get(target, key, receiver)
//       if (key === 'value') console.log('value', result)
//       console.log(' get overwrites miss result', !!result)
//       DEBUG[result] = `${DEBUG[target]}.${keyString}`
//       const wrapped = protect(result, target)
//       // if the result was proxied, store it as an overwrite
//       if (wrapped !== result) {
//         overwrites[key] = wrapped
//       }
//       return wrapped
//     },
//     getPrototypeOf: protectedTrap('getPrototypeOf', Reflect.getPrototypeOf),
//     isExtensible: protectedTrap('isExtensible', Reflect.isExtensible),
//     getOwnPropertyDescriptor: protectedTrap('getOwnPropertyDescriptor', Reflect.getOwnPropertyDescriptor),
//     has: protectedTrap('has', Reflect.has),
//     ownKeys: protectedTrap('ownKeys', Reflect.ownKeys),
//     // construct: protectedTrap('construct', Reflect.construct),
//     construct: (target, args, newTarget) => {
//       console.log(' construct', `${DEBUG[target]}`, args, !!new.target)
//       // const result = new target(...args)
//       const result = Reflect.construct(target, args, proxy)
//       // Reflect.setPrototypeOf(result, target.prototype)
//       // const result = Reflect.apply(target, proxy, args)

//       console.log(' construct - result has "a"', !!result.a)
//       DEBUG[result] = `${DEBUG[target]}-inst`
//       return protect(result)
//       // return result
//     },
//     apply (target, thisArg, args) {
//       // call with protected 'this'
//       // const safeThis = protect(thisArg)
//       console.log(' apply', `${DEBUG[target]}.call(${DEBUG[thisArg]}, ...args)`, !!new.target)
//       const returnValue = Reflect.apply(target, parentProxy, args)
//       // return protect(returnValue)
//       return returnValue
//     },

//     // modifications
//     set: (target, key, value) => {
//       const keyString = key.toString()
//       console.log(' set', `${DEBUG[target]}.${keyString}`, value)
//       deletes.delete(key)
//       overwrites[key] = value
//       return value
//     },
//     setPrototypeOf: throwReadOnlyError,
//     preventExtensions: throwReadOnlyError,
//     defineProperty: throwReadOnlyError,
//     deleteProperty: throwReadOnlyError
//   })

//   return proxy

//   function protectedTrap (label, reflectMethod) {
//     return (...args) => {
//       console.log('protectedTrap', label)
//       const returnValue = reflectMethod(...args)
//       const wrapped = protect(returnValue, proxy)
//       // const wrapped = returnValue
//       return wrapped
//     }
//   }

//   function throwReadOnlyError () {
//     throw Error('Protected object is read-only')
//   }
// }

function protect2 (value) {

  // primitives get passed through
  if (Object(value) !== value) {
    return value
  }

  const deletes = new Set()
  const overwrites = {}

  // wrap with in-Realm Proxy,
  // which protects values returned by accesses,
  // and errors when trying to modify
  const proxy = new Proxy(value, {
    // accesses
    get: (target, key, receiver) => {
      console.log(`get "${key.toString()}"`)
      let returnValue
      if (deletes.has(key)) {
        return
      } else if (key in overwrites) {
        returnValue = Reflect.get(overwrites, key, receiver)
      } else {
        returnValue = Reflect.get(target, key, receiver)
      }
      const wrapped = protect2(returnValue, proxy)
      if (wrapped !== returnValue) {
        Reflect.set(overwrites, key, wrapped)
      }
      return wrapped
    },
    // get: protectedTrap(Reflect.get),
    getPrototypeOf: protectedTrap('getPrototypeOf', Reflect.getPrototypeOf),
    isExtensible: protectedTrap('isExtensible', Reflect.isExtensible),
    getOwnPropertyDescriptor: protectedTrap('getOwnPropertyDescriptor', Reflect.getOwnPropertyDescriptor),
    has: (target, key) => {
      if (deletes.has(key)) return false
      if (key in overwrites) return true
      return Reflect.has(target, key)
    },
    // has: protectedTrap('has', Reflect.has),
    // ownKeys: protectedTrap('ownKeys', Reflect.ownKeys),
    ownKeys: (target) => {
      const keys = new Set()
      Reflect.ownKeys(target).forEach(key => keys.add(key))
      Reflect.ownKeys(overwrites).forEach(key => keys.add(key))
      Object.values(deletes).forEach(key => keys.delete(key))
      const result = Array.from(keys)
      console.log({ result })
      return result
    },
    // construct: protectedTrap('construct', Reflect.construct),
    construct: (target, args, newTarget) => {
      console.log('++construct start')
      let returnValue
      // if (target.toString().includes('class')) {
        // const proto = target.prototype
        // const instance = (Object(proto) === proto) ? Object.create(proto) : {}
        // const result = Function.prototype.apply.call(target, instance, args)
        // returnValue = Object(result) === result ? result : instance 
        returnValue = new target(...args)
      // } else {
      //   returnValue = Reflect.construct(target, args, newTarget)
      // }
      // trap.call(this.handler, target, args, newTarget);
      // const returnValue = Reflect.apply(target, newTarget, args)
      console.log('++construct end')
      const wrapped = protect2(returnValue, proxy)
      return wrapped
    },
    apply (target, thisArg, args) {
      // call with protected 'this'
      thisArg = protect2(thisArg)
      let returnValue = Reflect.apply(target, thisArg, args)
      return protect2(returnValue)
    },

    // modifications
    // set: throwReadOnlyError('set'),
    set: (target, key, value) => {
      console.log(` set "${key}"`)
      return Reflect.set(overwrites, key, value)
    },
    setPrototypeOf: throwReadOnlyError('setPrototypeOf'),
    preventExtensions: throwReadOnlyError('preventExtensions'),
    defineProperty: throwReadOnlyError('defineProperty'),
    deleteProperty: (target, key) => {
      console.log(`delete "${key}"`)
      deletes.add(key)
      Reflect.deleteProperty(overwrites, key)
    },
  })

  return proxy

  function protectedTrap (label, method) {
    return (...args) => {
      console.log(label)
      let returnValue = method(...args)
      return protect2(returnValue, proxy)
    }
  }

  function throwReadOnlyError (label) {
    return () => {
      throw Error(label + ' Protected object is read-only')
    }
  }

}
