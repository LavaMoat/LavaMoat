'use strict'
globalThis.setTimeout = function setTimeout() {
  if (this !== globalThis) {
    throw new TypeError(
      "'setTimeout' called on an object that does not implement interface Window"
    )
  }
}
