"use strict"

const { Membrane } = require('es-membrane')


// create raw object to be protected by membrane
const rawObj = { secure: true }

// create membrane to manage interaction
const membrane = new Membrane()

// make normal xHandler
const xHandler = membrane.getHandlerByName('x', { mustCreate: true })

// make read-only yHandler
const yHandler = membrane.getHandlerByName('y', { mustCreate: true })
createKowtowHandler(yHandler)

function createKowtowHandler (handler) {
  const nextHandler = handler.nextHandler || Reflect
  const overwrites = new WeakMap()

  // RESEARCH
  // target is from what space? receiver?
  // nextHandler returns values from what space?
  // how to convert between spaces?

  // !! overwrites need to be per-object !!

  function getOverwritesForTarget (target) {
    // return if already populated
    if (overwrites.has(target)) return overwrites.get(target)
    // otherwise create
    const writes = new Map()
    const deletes = new Set()
    const overwriteLayer = { writes, deletes }
    overwrites.set(target, overwriteLayer)
    return overwriteLayer
  }

  function overwriteValueLookup (target, key) {
    const { writes, deletes } = getOverwritesForTarget(target)
    if (deletes.has(key)) return undefined
    const prop = writes.get(key)
    if (prop === undefined) return undefined
    if (prop.value) return prop.value
    throw new Error('overwriteValueLookup - setters not supported yet')
  }

  handler.get = (target, key, receiver) => {
    const { writes, deletes } = getOverwritesForTarget(target)
    // overwrite layer
    if (writes.has(key)) {
      return overwriteValueLookup(key)
    }
    // fallback
    return nextHandler.get(target, key, receiver)
  }

  handler.set = (target, key, value, receiver) => {
    const { writes, deletes } = getOverwritesForTarget(target)
    // get prop desc with overwrite layer
    const propDesc = handler.getOwnPropertyDescriptor(target, key)
    if (propDesc && propDesc.set) {
      throw new Error('handler.set - setters not supported yet')
    }
    // add to overwrite layer
    deletes.delete(key)
    writes.set(key, { value })
  }

  handler.getOwnPropertyDescriptor = (target, key) => {
    const { writes, deletes } = getOverwritesForTarget(target)
    // overwrite layer
    if (deletes.has(key)) return undefined
    if (writes.has(key)) return writes.get(key)
    // fallback
    return nextHandler.getOwnPropertyDescriptor(target, key)
  }

  handler.defineProperty = (target, key, descriptor) => {
    const { writes, deletes } = getOverwritesForTarget(target)
    // write to overwrite layer
    deletes.delete(key)
    writes.set(key, descriptor)
  }

  handler.deleteProperty = (target, key) => {
    const { writes, deletes } = getOverwritesForTarget(target)
    // write to overwrite layer
    writes.delete(key)
    deletes.add(key)
  }
}
// - [x] get, check overwrites
// - [x] set, check for setter, write to overwrites
// - [ ] getPrototypeOf, check overwrites
// - [ ] setPrototypeOf, write to overwrites
// - [ ] isExtensible, check overwrites
// - [ ] preventExtensions, write to overwrites
// - [x] getOwnPropertyDescriptor, check overwrites
// - [x] defineProperty, check configurable (overwrites + base), delete deletes, write overwrites
// - [ ] has, check overwrites, deletes, base
// - [x] deleteProperty, check configurable, write to deletes
// - [ ] ownKeys, target + writes - deletes
// - [x] apply, maybe default membrane ok
// - [x] construct,  maybe default membrane ok

// create view of rawObj through yHandler
const readOnlyObj = membrane.convertArgumentToProxy(
  xHandler,
  yHandler,
  rawObj
)

// test results

test('assign', () => {
  // fails, throws in strict mode
  readOnlyObj.secure = false
})

test('delete', () => {
  // fails, throws in strict mode
  delete readOnlyObj.secure
})

test('Reflect.defineProperty', () => {
  // fails, returns false
  Reflect.defineProperty(readOnlyObj, 'secure', { value: false })
})

test('Reflect.set', () => {
  // fails, returns false
  Reflect.set(readOnlyObj, 'secure', false)
})

test('Reflect.deleteProperty', () => {
  // fails, returns false
  Reflect.deleteProperty(readOnlyObj, 'secure')
})

console.log('rawObj secure?', rawObj.secure === true) //=> true
console.log('view secure?', readOnlyObj.secure === true) //=> true


function test (label, testFn) {
  try {
    testFn()
  } catch (err) {
    // console.warn(err)
  }
  if (rawObj.secure !== true) {
    throw new Error(`test failed "${label}"`)
  }
}