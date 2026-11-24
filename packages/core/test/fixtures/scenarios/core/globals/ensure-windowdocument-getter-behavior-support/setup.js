'use strict'
// document getter must be called with this=globalThis or it throws (simulates a browser window)
Object.defineProperty(globalThis, 'document', {
  get() {
    if (this !== globalThis) {
      throw new TypeError(
        "'get document' called on an object that does not implement interface Window"
      )
    }
    return { location: { href: 'beepboop.bong' } }
  },
  configurable: true,
  enumerable: true,
})
