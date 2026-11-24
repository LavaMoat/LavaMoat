'use strict'
// Both `get` and `check` close over the same object so identity checks pass
// across compartment boundaries.
const testObj = {}
globalThis.get = () => testObj
globalThis.check = (target) => target === testObj
