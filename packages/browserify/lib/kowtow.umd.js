(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.kowtow = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (global){
'use strict'

module.exports = createCopyFactory

function createCopyFactory() {
  const originalToProxy = new WeakMap()
  const proxyToShadows = new WeakMap()

  return createCopy
  
  function createCopy (target, debugLabel = '<root>') {
    // return original target if proxy is not possible
    if (!shouldCopy(target)) return target
    // reuse existing proxies
    if (originalToProxy.has(target)) {
      // console.warn(`*** proxy reused ${debugLabel}`)
      return originalToProxy.get(target)
    }
    // return as is if already a proxy
    if (proxyToShadows.has(target)) {
      return target
    }
    // prepare a proxy
    const writes = new Map()
    const deletes = new Set()

    global.copyCount = global.copyCount || 0
    global.copyCount++
    // console.warn(`+++ proxy new #${global.copyCount} - ${debugLabel}`)

    // const readOnlyProps = Object.getOwnPropertyDescriptors(target).map(propIsReadOnly)
    //

    // we set the Proxy's target to a false target for easier enforcing of some invariants
    // e.g.: Proxy invariant #1
    // https://www.ecma-international.org/ecma-262/8.0/#sec-proxy-object-internal-methods-and-internal-slots-get-p-receiver
    // TypeError: 'get' on proxy: property 'prototype' is a read-only and non-configurable data property on the proxy target but the proxy did not return its actual value (expected '#<Original>' but got '[object Object]')
    // we use an arrow function bc it doesnt have a prototype
    // const proxyTarget = typeof target === 'function' ? () => {} : {}
    let proxyTarget
    if (typeof target === 'function') {
      proxyTarget = target.prototype ? function(){} : ()=>{}
    } else {
      proxyTarget = Object.create(null)
    }

    const proxyHandlers = {
      get (_, key, receiver) {
        const keyString = String(key)
        // console.warn('$$$ get', debugLabel, keyString)
        // read from overrides
        if (writes.has(key)) {
          return writes.get(key).value
        }
        // read from proxy target
        const value = Reflect.get(target, key, receiver)
        return createCopy(value, `${debugLabel}.${keyString}`)
      },
      set (_, key, value, receiver) {
        // console.warn('$$$ set', debugLabel, key, !!receiver)
        
        // check property descriptors for setter
        const targetPropDesc = proxyHandlers.getOwnPropertyDescriptor(_, key)
        if (targetPropDesc) {
          // console.warn('~~~ target has prop desc')
          if (targetPropDesc.set) {
            // console.warn('~~~ target has setter for prop')
          }
        }
        if (targetPropDesc && targetPropDesc.set) {
          const setter = targetPropDesc.set
          return setter.call(receiver, value)
        }

        // if (!receiver) console.warn('~~~~ no receiver')
        if (proxyToShadows.has(receiver)) {
          // console.warn('~~~ receiver is proxy')
        } else {
          // console.warn('~~~ receiver is NOT proxy')
          if (originalToProxy.has(receiver)) {
            // console.warn('~~~ receiver has proxy')
          } else {
            // console.warn('~~~ receiver does NOT have proxy')
          }
          return Reflect.set(target, key, value, receiver)
        }

        const receiverProxy = receiver
        const receiverWrites = proxyToShadows.get(receiverProxy).writes

        receiverWrites.set(key, {
          value,
          writable: true,
          enumerable: true,
          configurable: true,
        })
        return value
      },
      getPrototypeOf (_) {
        // console.warn('$$$ getPrototypeOf', debugLabel)
        const result = Reflect.getPrototypeOf(target)
        return createCopy(result, `${debugLabel}.<prototype>`)
      },
      setPrototypeOf (_, newPrototype) {
        // console.warn('$$$ setPrototypeOf', debugLabel)
        return Reflect.setPrototypeOf(target, newPrototype)
      },
      isExtensible (_) {
        // console.warn('$$$ isExtensible', debugLabel)
        return Reflect.isExtensible(target)
      },
      preventExtensions (_) {
        // console.warn('$$$ preventExtensions', debugLabel)
        return Reflect.preventExtensions(target)
      },
      getOwnPropertyDescriptor (_, key) {
        const keyString = String(key)
        // console.warn('$$$ getOwnPropertyDescriptor', debugLabel, keyString)
        // check shadowed values
        if (deletes.has(key)) return undefined
        if (writes.has(key)) return writes.get(key)
        // look up on target and copy value
        const propDesc = Reflect.getOwnPropertyDescriptor(target, key)
  
        // if no property found, return
        if (!propDesc) return

        // wrap value
        if ('value' in propDesc) {
          propDesc.value = createCopy(propDesc.value, `${debugLabel}.${keyString}`)
        }

        // enforce proxy invariant
        // ensure proxy target has non-configurable property
        if (!propDesc.configurable) {
          const proxyTargetPropDesc = Reflect.getOwnPropertyDescriptor(proxyTarget)
          const proxyTargetPropIsConfigurable = (!proxyTargetPropDesc || proxyTargetPropDesc.configurable)
          // console.warn('@@ getOwnPropertyDescriptor - non configurable', String(key), !!proxyTargetPropIsConfigurable)
          // if proxy target is configurable (and real target is not) update the proxy target to ensure the invariant holds
          if (proxyTargetPropIsConfigurable) {
            Reflect.defineProperty(proxyTarget, key, propDesc)
          }
        }
        return propDesc
      },
      defineProperty (_, key, descriptor) {
        // console.warn('$$$ defineProperty', debugLabel)
        // check if valid to define
        const targetPropDesc = proxyHandlers.getOwnPropertyDescriptor(_, key)
        if (targetPropDesc && !targetPropDesc.configurable) {
          // trigger error
          throw new TypeError(`Cannot redefine property: ${key}`)
        }
        //
        deletes.delete(key)
        writes.set(key, descriptor)
        return true
      },
      has (_, key) {
        const keyString = String(key)
        // console.warn('$$$ has', debugLabel, keyString)
        if (writes.has(key)) {
          return true
        }
        if (deletes.has(key)) {
          return false
        }
        return Reflect.has(target, key)
      },
      deleteProperty (_, key) {
        const keyString = String(key)
        // console.warn('$$$ deleteProperty', debugLabel, keyString)
        // ensure its not in our writes
        writes.delete(key)
        // if proxy target has value, shadow with a delete
        if (Reflect.has(target, key)) {
          deletes.set(key)
        }
      },
      ownKeys (_) {
        // console.warn('$$$ ownKeys', debugLabel)
        // add targets keys
        const targetKeys = Reflect.ownKeys(target)
        const keys = new Set(targetKeys)
        // add additional keys
        for (let key of writes.keys()) keys.add(key)
        // remove deleted keys
        for (let key of deletes.keys()) keys.delete(key)
        // console.warn('$$$ ownKeys', Array.from(keys).length, keys, typeof proxyTarget)
        // tape's t.deepEqual needs this to be an array (?)
        return Array.from(keys.values())
      },
      apply (_, thisArg, argumentsList) {
        // console.warn('$$$ apply', debugLabel)
        const result = Reflect.apply(target, thisArg, argumentsList)
        return createCopy(result, `${debugLabel}.<apply>`) 
      },
      construct (_, args, thisArg) {
        // console.warn('$$$ construct', debugLabel, thisArg)
        const inst = Reflect.construct(target, args, thisArg)
        return inst
      },
    }
    const proxy = new Proxy(proxyTarget, proxyHandlers)
    const shadows = { writes, deletes }
    // record proxy replacing target
    originalToProxy.set(target, proxy)
    proxyToShadows.set(proxy, shadows)
    // return proxy
    return proxy
  }
}

function shouldCopy (target) {
  if (target === null) return false
  switch (typeof target) {
    case 'object':
    case 'function':
      return true
    default:
      return false
  }
}

function propIsReadOnly (prop) {
  return !prop.configurable && !prop.writable
}
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],2:[function(require,module,exports){
module.exports = require(`kowtow`)

},{"kowtow":1}]},{},[2])(2)
});
