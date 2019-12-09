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
yHandler.setPrototypeOf = () => false
yHandler.preventExtensions = () => false
yHandler.defineProperty = () => false
yHandler.set = () => false
yHandler.deleteProperty = () => false

// create view of rawObj through yHandler
const readOnlyObj = membrane.convertArgumentToProxy(
  xHandler,
  yHandler,
  rawObj
)

// test results
try {
  // fails, throws in strict mode
  readOnlyObj.secure = false
} catch (_) {}
try {
  // fails, throws in strict mode
  delete readOnlyObj.secure
} catch (_) {}
// fails, returns false
Reflect.defineProperty(readOnlyObj, 'secure', { value: false })
// fails, returns false
Reflect.set(readOnlyObj, 'secure', false)
// fails, returns false
Reflect.deleteProperty(readOnlyObj, 'secure')

console.log('secure?', rawObj.secure === true) //=> true