const test = require('ava')

const {
  runSimpleOneTwo,
} = require('./util')


test('globalRef - check default containment', async (t) => {
  function defineOne () {
    let objCheckThis, objCheckSelf, objCheckGlobal, thisIsExports
    const isUndefined = {}

    try { objCheckThis = this.Object === Object } catch (_) { }
    try { objCheckSelf = self.Object === Object } catch (_) { }
    try { objCheckGlobal = global.Object === Object } catch (_) { }
    try { thisIsExports = exports === this } catch (_) { }

    isUndefined.global = typeof global === "undefined"
    isUndefined.self = typeof self === "undefined"
    isUndefined.window = typeof window === "undefined"

    module.exports = { objCheckThis, objCheckSelf, objCheckGlobal, thisIsExports, isUndefined }
  }

  const result = await runSimpleOneTwo({ defineOne })

  // this is how it behaves in browser via browserify
  t.deepEqual(result, {
    objCheckThis: false,
    objCheckSelf: true,
    objCheckGlobal: true,
    thisIsExports: true,
    isUndefined: {
      global: false,
      self: false,
      window: false
    }
  }, 'test result matches expected')

  // // this is how it behaves in node (browserify or not)
  // t.deepEqual(result, {
  //   objCheckThis: false,
  //   objCheckSelf: undefined,
  //   objCheckGlobal: true,
  //   thisIsExports: true,
  // }, 'test result matches expected')

  // // this is how it behaves in node (only toplevel in REPL)
  // t.deepEqual(result, {
  //   objCheckThis: true,
  //   objCheckSelf: undefined,
  //   objCheckGlobal: true,
  //   thisIsExports: false,
  // }, 'test result matches expected')
})

test('globalRef - ensure endowments are accessible on globals', async (t) => {
  function defineOne () {
    let checkSelf, checkThis, checkWindow, checkGlobal, contextHasPostMessage, selfHasPostMessage

    contextHasPostMessage = typeof postMessage !== 'undefined'
    selfHasPostMessage = !!self.postMessage
    try { checkThis = this.postMessage === postMessage } catch (err) { checkThis = err.message }
    try { checkSelf = self.postMessage === postMessage } catch (err) { checkSelf = err.message }
    try { checkWindow = window.postMessage === postMessage } catch (err) { checkWindow = err.message }
    try { checkGlobal = global.postMessage === postMessage } catch (err) { checkGlobal = err.message }

    module.exports = { checkThis, checkSelf, checkWindow, checkGlobal, contextHasPostMessage, selfHasPostMessage }
  }

  const config = {
    resources: {
      '<root>': {
        packages: {
          one: true
        }
      },
      one: {
        globals: {
          postMessage: true
        }
      }
    }
  }

  const testGlobal = { postMessage: () => { throw new Error('this should never be called') } }
  const result = await runSimpleOneTwo({ defineOne, config, testGlobal })

  // this is how it behaves in browser via browserify
  t.deepEqual(result, {
    // "this" is module.exports
    checkThis: false,
    checkSelf: true,
    checkWindow: true,
    checkGlobal: true,
    contextHasPostMessage: true,
    selfHasPostMessage: true
  }, 'test result matches expected')
})

