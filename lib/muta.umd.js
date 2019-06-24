(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Muta = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */

// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
module.exports = function (obj) {
  return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer)
}

function isBuffer (obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer (obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBuffer(obj.slice(0, 0))
}

},{}],2:[function(require,module,exports){
'use strict'

const VirtualObject = require('./src/virtualObject.js')
const { ASSIGN, DELETE } = VirtualObject
const VirtualArray = require('./src/virtualArray.js')
const { PUSH, POP, SHIFT, UNSHIFT } = VirtualArray
const { getKeys } = require('./src/common.js')

module.exports =
function muta (target) {
  let patch
  if (Array.isArray(target)) {
    patch = new VirtualArray(target)
  } else {
    patch = new VirtualObject(target)
  }
  return patch.wrapper
}

module.exports.commit =
function commit (wrapper) {
  let patch = unwrap(wrapper)
  patch.commit()
}

module.exports.patch =
module.exports.getPatch =
function patch (wrapper) {
  let patch = unwrap(wrapper)
  return patch.patch
}

module.exports.isMuta =
function isMuta (wrapper) {
  if (wrapper == null || typeof wrapper !== 'object') {
    return false
  }
  return wrapper[VirtualObject.PATCH] != null
}

module.exports.wasMutated =
function wasMutated (wrapper) {
  return getKeys(unwrap(wrapper).patch).length > 0
}

Object.assign(module.exports, {
  ASSIGN,
  DELETE,
  PUSH,
  POP,
  SHIFT,
  UNSHIFT
})

function unwrap (wrapper) {
  let patch = wrapper[VirtualObject.PATCH]
  if (patch == null) {
    throw Error('Argument must be a muta wrapped object')
  }
  return patch
}

},{"./src/common.js":4,"./src/virtualArray.js":6,"./src/virtualObject.js":7}],3:[function(require,module,exports){
'use strict'

const SHIFT = Symbol('shift')
const POP = Symbol('pop')
const PUSH = Symbol('push')
const UNSHIFT = Symbol('unshift')

function arrayPatch (state) {
  return new Proxy(state, { get, set })
}

function get (target, key) {
  if (key in target) {
    return target[key]
  }

  if (isGrowOp(key)) {
    return ghostArray(target, key)
  }

  if (isShrinkOp(key)) {
    return 0
  }

  return Reflect.get(target, key)
}

function set (target, key, value) {
  if (isShrinkOp(key) && value === 0) {
    delete target[key]
    return true
  }
  return Reflect.set(target, key, value)
}

function isShrinkOp (key) {
  return key === POP || key === SHIFT
}
function isGrowOp (key) {
  return key === PUSH || key === UNSHIFT
}

function ghostArray (parent, parentKey) {
  let set = (target, key, value) => {
    let res = Reflect.set(target, key, value)
    let empty = target.length === 0
    let arrayIsSet = parentKey in parent
    if (!empty && !arrayIsSet) {
      parent[parentKey] = array
    } else if (empty && arrayIsSet) {
      delete parent[parentKey]
    }
    return res
  }
  let array = new Proxy([], { set })
  return array
}

module.exports = arrayPatch
Object.assign(module.exports, {
  PUSH,
  POP,
  UNSHIFT,
  SHIFT
})

},{}],4:[function(require,module,exports){
'use strict'

function keyToIndex (key) {
  try {
    let index = parseInt(key, 10)
    if (index >= 0 && index.toString() === key) {
      return index
    }
  } catch (err) {}
  return key
}

function getKeys (object) {
  return [].concat(
    Object.getOwnPropertyNames(object),
    Object.getOwnPropertySymbols(object)
  )
}

module.exports = { keyToIndex, getKeys }

},{}],5:[function(require,module,exports){
'use strict'

// all unset properties are resolved as a recursive
// infiniteObject. only recursive objects which have
// properties set on them will persist, e.g.:
//
// let obj = infiniteObject()
// obj.foo.bar.baz = 123
// // obj is { foo: { bar: { baz: 123 } } }
// delete obj.foo.bar.baz
// // obj is {}
function infiniteObject (parent, selfKey) {
  let state = {}
  let nKeys = 0

  let object = new Proxy(state, {
    get (target, key) {
      if (key in target) {
        return target[key]
      }

      return infiniteObject(object, key)
    },

    has (target, key) {
      return key in target
    },

    set (target, key, value) {
      if (parent != null && nKeys === 0) {
        parent[selfKey] = object
      }

      if (!(key in target)) {
        nKeys += 1
      }

      target[key] = value
      return true
    },

    deleteProperty (target, key) {
      if (!(key in target)) return true

      nKeys -= 1
      if (parent != null && nKeys === 0) {
        delete parent[selfKey]
      }

      delete target[key]
      return true
    }
  })

  return object
}

module.exports = infiniteObject

},{}],6:[function(require,module,exports){
'use strict'

const VirtualObject = require('./virtualObject.js')
const { keyToIndex } = require('./common.js')
const arrayPatch = require('./arrayPatch.js')
const infiniteObject = require('./infiniteObject.js')
const {
  PUSH,
  POP,
  UNSHIFT,
  SHIFT
} = arrayPatch

// VirtualArray represents a wrapper around a target array,
// allowing virtual mutations including overriding elements,
// shrinking, and growing. Currently, splicing is not supported
// so growing and shrinking must happen at the ends (push, unshift, pop, shift).
class VirtualArray extends VirtualObject {
  constructor (target, patch = infiniteObject()) {
    patch = arrayPatch(patch)
    super(target, patch)
  }

  length () {
    let length = this.target.length
    length += this.patch[PUSH].length
    length += this.patch[UNSHIFT].length
    length -= this.patch[POP]
    length -= this.patch[SHIFT]
    return length
  }

  resolveIndex (index) {
    let { patch, target } = this

    let unshiftLen = patch[UNSHIFT].length
    if (index < unshiftLen) {
      return { index, array: patch[UNSHIFT] }
    }
    index -= unshiftLen
    index += patch[SHIFT]

    let targetLen = target.length - patch[POP]
    if (index < targetLen) {
      return { index, array: target }
    }

    index -= targetLen

    let pushLen = patch[PUSH].length
    if (index < pushLen) {
      return { index, array: patch[PUSH] }
    }
  }

  get (target, key) {
    if (key === 'length') {
      return this.length()
    }

    if (key === Symbol.iterator) {
      return this.iterator()
    }

    let index = keyToIndex(key)
    if (typeof index !== 'number') {
      if (key in methods) {
        return methods[key].bind(this)
      }
      return super.get(this.target, key)
    }

    let res = this.resolveIndex(index)
    if (res == null) return

    if (res.array === this.target) {
      return super.get(this.target, res.index)
    }

    return res.array[res.index]
  }

  set (target, key, value) {
    if (key === 'length') {
      return this.setLength(value)
    }

    let index = keyToIndex(key)
    if (typeof index !== 'number') {
      return super.set(this.target, key, value)
    }

    if (index >= this.length()) {
      this.setLength(index + 1)
    }

    let res = this.resolveIndex(index)

    if (res.array === this.target) {
      return super.set(this.target, res.index, value)
    }

    res.array[res.index] = value
    return true
  }

  deleteProperty (target, key) {
    let index = keyToIndex(key)
    if (typeof index !== 'number') {
      return super.deleteProperty(this.target, key)
    }

    let res = this.resolveIndex(index)
    if (res == null) {
      return true
    }

    if (res.array === this.target) {
      return super.deleteProperty(this.target, res.index)
    }

    delete res.array[res.index]
    return true
  }

  has (target, key) {
    let index = keyToIndex(key)
    if (typeof index !== 'number') {
      return super.has(this.target, key)
    }

    let res = this.resolveIndex(index)
    if (res == null) return false

    if (res.array === this.target) {
      return super.has(this.target, res.index)
    }
    return res.index in res.array
  }

  getOwnPropertyDescriptor (target, key) {
    if (!this.has(target, key)) return

    let index = keyToIndex(key)
    if (typeof index !== 'number') {
      return super.getOwnPropertyDescriptor(this.target, key)
    }

    let res = this.resolveIndex(index)

    if (res.array === this.target) {
      return super.getOwnPropertyDescriptor(this.target, res.index)
    }

    return {
      value: this.get(this.target, key),
      writable: true,
      enumerable: true,
      configurable: true
    }
  }

  ownKeys (target) {
    let keys = []
    for (let i = 0; i < this.length(); i++) {
      let key = String(i)
      if (this.has(target, key)) {
        keys.push(key)
      }
    }

    let objectKeys = super.ownKeys(this.target)
    for (let key of objectKeys) {
      let index = keyToIndex(key)
      if (typeof index === 'number') continue
      keys.push(key)
    }

    return keys
  }

  setLength (length) {
    if (!Number.isInteger(length) || length < 0) {
      throw RangeError('Invalid array length')
    }

    let { patch, target } = this
    let lengthChange = length - this.length()

    // noop
    if (lengthChange === 0) {
      return true
    }

    // increase length by setting on 'push' values
    // TODO: subtract from pop count if > 0 (and delete index?)
    if (lengthChange > 0) {
      patch[PUSH].length += lengthChange
      return true
    }

    // decrease length (lengthChange is < 0)
    lengthChange = -lengthChange

    // shorten or remove push array
    if (lengthChange <= patch[PUSH].length) {
      patch[PUSH].length -= lengthChange
      return true
    }
    lengthChange -= patch[PUSH].length
    patch[PUSH].length = 0

    // shorten target range via pop count
    let targetSliceLength = target.length - patch[POP] - patch[SHIFT]
    if (lengthChange <= targetSliceLength) {
      // target slice is long enough, now we're done
      patch[POP] += lengthChange
      return true
    } else {
      // pop all of target slice and continue
      patch[POP] += targetSliceLength
      lengthChange -= targetSliceLength
    }

    // shorten unshift array
    patch[UNSHIFT].length -= lengthChange
    return true
  }

  iterator () {
    let self = this
    return function * () {
      for (let i = 0; i < self.length(); i++) {
        yield self.get(null, i)
      }
    }
  }

  commit () {
    super.commit()

    let { patch, target } = this

    // remove shifted elements, add unshifted elements
    target.splice(
      0,
      patch[SHIFT],
      ...patch[UNSHIFT]
    )
    // remove popped elements, add pushed elements
    target.splice(
      target.length - patch[POP],
      patch[POP],
      ...patch[PUSH]
    )

    delete patch[PUSH]
    delete patch[UNSHIFT]
    delete patch[POP]
    delete patch[SHIFT]
  }
}

const methods = {
  pop () {
    let length = this.length()
    if (length === 0) return

    let { target } = this

    let res = this.resolveIndex(length - 1)
    if (res.array !== target) {
      return res.array.pop()
    }

    let value = this.get(target, length - 1)
    this.setLength(length - 1)
    return value
  },

  shift () {
    if (this.length() === 0) return

    let { patch, target } = this

    let res = this.resolveIndex(0)
    if (res.array !== target) {
      return res.array.shift()
    }

    let value = this.get(target, 0)
    patch[SHIFT] += 1
    return value
  },

  unshift (...args) {
    let { patch } = this
    while (patch[SHIFT] > 0 && args.length > 0) {
      patch[SHIFT] -= 1
      this.set(this.target, 0, args.pop())
    }
    if (args.length > 0) {
      return patch[UNSHIFT].unshift(...args)
    }
    return this.length()
  },

  push (...args) {
    let { patch, target } = this
    while (patch[POP] > 0 && args.length > 0) {
      patch[POP] -= 1
      this.set(target, this.length() - 1, args.shift())
    }
    if (args.length > 0) {
      return patch[PUSH].push(...args)
    }
    return this.length()
  },

  splice (index, removeCount, ...insert) {
    // equivalent to SHIFT/UNSHIFT
    if (index === 0) {
      let removed = this.wrapper.slice(0, removeCount)
      // TODO: do this in way less operations by possibly consuming range of UNSHIFT
      for (let i = 0; i < removeCount; i++) {
        this.wrapper.shift()
      }
      this.wrapper.unshift(...insert)
      return removed
    }

    // equivalent to POP/PUSH
    if (index === this.length() - removeCount) {
      let removed = this.wrapper.slice(this.length() - removeCount)
      // TODO: do this in way less operations by possibly consuming range of POP
      for (let i = 0; i < removeCount; i++) {
        this.wrapper.pop()
      }
      this.wrapper.push(...insert)
      return removed
    }

    throw Error('VirtualArray currently only supports slicing at the end of the array')
  }
}

module.exports = VirtualArray
Object.assign(VirtualArray, {
  PUSH,
  POP,
  UNSHIFT,
  SHIFT
})

},{"./arrayPatch.js":3,"./common.js":4,"./infiniteObject.js":5,"./virtualObject.js":7}],7:[function(require,module,exports){
(function (Buffer){
'use strict'

const infiniteObject = require('./infiniteObject.js')
const { getKeys } = require('./common.js')

const ASSIGN = Symbol('assign')
const DELETE = Symbol('delete')
const PATCH = Symbol('muta patch')

// VirtualObject represents a wrapper over some target data,
// which when mutated will only mutate a "patch" object, and
// can be accessed as if the mutations were made to the original
// data. The patch changes can be flushed/committed to the target
// data later, or thrown away.
class VirtualObject {
  constructor (target, patch = infiniteObject()) {
    this.target = target
    this.patch = patch
    this.wrapper = new Proxy(this.target, this)
  }

  get (target, key) {
    // lets us unwrap by accessing the PATCH symbol key
    if (key === PATCH) {
      return this
    }

    // key is assigned to, resolve with virtual value (no need to wrap)
    if (this.assignsTo(key)) {
      return this.patch[ASSIGN][key]
    }

    // key is deleted
    if (this.deletes(key)) {
      return undefined
    }

    // key is not overridden by patch,
    // OR key is recursively patched
    return this.wrap(target[key], this.patch[key])
  }

  has (target, key) {
    if (this.assignsTo(key)) {
      return true
    }
    if (this.deletes(key)) {
      return false
    }

    // key is not overridden by patch,
    // OR key is recursively patched
    return key in target
  }

  set (target, key, value) {
    // if set back to original value, remove from patch
    if (key in target && target[key] === value) {
      if (this.assignsTo(key)) {
        delete this.patch[ASSIGN][key]
      } else if (this.deletes(key)) {
        delete this.patch[DELETE][key]
      }
      return true
    }

    this.patch[ASSIGN][key] = value

    if (key in this.patch) {
      delete this.patch[key]
    } else if (this.deletes(key)) {
      delete this.patch[DELETE][key]
    }
    return true
  }

  deleteProperty (target, key) {
    // we don't need the delete operation if target is virtual or key doesn't
    // exist in target
    if (target !== this.patch && key in target) {
      this.patch[DELETE][key] = true
    }

    if (key in this.patch) {
      delete this.patch[key]
    } else if (this.assignsTo(key)) {
      delete this.patch[ASSIGN][key]
    }
    return true
  }

  ownKeys (target) {
    // get target keys
    let keys = getKeys(target)

    // filter out deleted keys
    if (DELETE in this.patch) {
      keys = keys.filter((key) => {
        return !(key in this.patch[DELETE])
      })
    }

    // add newly assigned keys
    if (ASSIGN in this.patch) {
      let assignedKeys = getKeys(this.patch[ASSIGN])
      for (let key of assignedKeys) {
        if (key in target) continue
        keys.push(key)
      }
    }

    return keys
  }

  getOwnPropertyDescriptor (target, key) {
    if (DELETE in this.patch) {
      if (key in this.patch[DELETE]) {
        return undefined
      }
    }

    if (ASSIGN in this.patch) {
      if (key in this.patch[ASSIGN]) {
        return {
          value: this.patch[ASSIGN][key],
          writable: true,
          configurable: true,
          enumerable: true
        }
      }
    }

    if (key in this.patch) {
      return {
        value: this.wrap(target[key], this.patch[key]),
        writable: true,
        configurable: true,
        enumerable: true
      }
    }

    return Reflect.getOwnPropertyDescriptor(target, key)
  }

  construct (Target, args, newTarget) {
    let result
    if (Target.toString().includes('class')) {
      result = new Target(...args)
    } else {
      result = Reflect.construct(Target, args, newTarget)
    }
    return this.wrap(result, this.patch['construct'])
  }

  assignsTo (key) {
    return ASSIGN in this.patch &&
      key in this.patch[ASSIGN]
  }

  deletes (key) {
    return DELETE in this.patch &&
      key in this.patch[DELETE]
  }

  commit () {
    // assign
    if (ASSIGN in this.patch) {
      Object.assign(this.target, this.patch[ASSIGN])
      delete this.patch[ASSIGN]
    }

    // delete
    if (DELETE in this.patch) {
      for (let key in this.patch[DELETE]) {
        delete this.target[key]
      }
      delete this.patch[DELETE]
    }

    // recurse
    for (let key in this.patch) {
      let child = wrap(this.target[key], this.patch[key], this.wrapper)
      child.commit()
    }
  }

  wrap (target, patch) {
    if (!isWrappable(target)) {
      return target
    }

    let child = wrap(target, patch, this.wrapper)
    return child.wrapper
  }
}

module.exports = VirtualObject
Object.assign(module.exports, {
  ASSIGN,
  DELETE,
  PATCH
})

function wrap (target, patch, wrapper) {
  if (typeof target === 'function') {
    let original = target
    target = (...args) => {
      return original.call(wrapper, ...args)
    }
  }

  if (Array.isArray(target)) {
    let VA = require('./virtualArray.js')
    return new VA(target, patch)
  } else {
    return new VirtualObject(target, patch)
  }
}

function isWrappable (value) {
  if (value == null) return false
  // XXX: don't wrap Buffers, since it causes issues with native Buffer methods
  if (Buffer.isBuffer(value)) return false
  return typeof value === 'object' ||
    typeof value === 'function'
}

}).call(this,{"isBuffer":require("../../../.nvm/versions/node/v10.16.0/lib/node_modules/browserify/node_modules/is-buffer/index.js")})
},{"../../../.nvm/versions/node/v10.16.0/lib/node_modules/browserify/node_modules/is-buffer/index.js":1,"./common.js":4,"./infiniteObject.js":5,"./virtualArray.js":6}]},{},[2])(2)
});
