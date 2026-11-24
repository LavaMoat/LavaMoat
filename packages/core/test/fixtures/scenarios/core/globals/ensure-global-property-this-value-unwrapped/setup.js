'use strict'
// xyz getter: endowmentsToolkit calls it with this = the real globalThis
Object.defineProperty(globalThis, 'xyz', {
  get() { return this === globalThis },
  configurable: true,
  enumerable: true,
})
