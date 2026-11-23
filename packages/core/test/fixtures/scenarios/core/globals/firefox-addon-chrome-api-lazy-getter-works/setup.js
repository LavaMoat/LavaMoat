'use strict'
// First set the static context value (matching original context: { chrome: { runtime: 'xyz' } })
globalThis.chrome = { runtime: 'xyz' }

// Then apply the lazy getter (matching beforeCreateKernel)
function exportLazyGetter(object, prop, getter) {
  var redefine = function (value) {
    if (value === undefined) {
      delete object[prop]
    } else {
      Object.defineProperty(object, prop, {
        enumerable: true,
        configurable: true,
        writable: true,
        value: value,
      })
    }
    getter = null
    return value
  }
  Object.defineProperty(object, prop, {
    enumerable: true,
    configurable: true,
    get: function () {
      return redefine(getter.call(this))
    },
    set: function (value) {
      redefine(value)
    },
  })
}
exportLazyGetter(globalThis, 'chrome', function () { return 'xyz' })
