'use strict'
// Both testGet and testCheck close over the same object so identity checks pass
// across compartment boundaries (SES Compartments do not membrane-wrap objects).
const testObj = {}
globalThis.testGet = () => testObj
globalThis.testCheck = (target) => target === testObj
