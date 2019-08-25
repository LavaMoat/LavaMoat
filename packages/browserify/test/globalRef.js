const test = require('tape-promise').default(require('tape'))
const clone = require('clone')

const {
  createBundleFromRequiresArray,
} = require('./util')

// const wrapModuleContent

test('globalRef - check default containment', async (t) => {
  const moduleContent = `
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
  `

  const result = await testCodeInNonEntryBundle(t, moduleContent)

  // this is how it behaves in browser via browserify
  t.deepEqual(result, {
    objCheckThis: false,
    objCheckSelf: true,
    objCheckGlobal: true,
    thisIsExports: true,
    isUndefined: {
      global: false,
      self: false,
      window: false,
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


// test('globalRef - ensure apis on window are not shadowed', async (t) => {
test('globalRef - ensure endowments are accessible on globals', async (t) => {
  const moduleContent = `
  let checkSelf, checkThis, checkWindow, checkGlobal, contextHasPostMessage, selfHasPostMessage
 
  contextHasPostMessage = typeof postMessage !== 'undefined'
  selfHasPostMessage = !!self.postMessage
  try { checkThis = this.postMessage === postMessage } catch (err) { checkThis = err.message }
  try { checkSelf = self.postMessage === postMessage } catch (err) { checkSelf = err.message }
  try { checkWindow = window.postMessage === postMessage } catch (err) { checkWindow = err.message }
  try { checkGlobal = global.postMessage === postMessage } catch (err) { checkGlobal = err.message }

  module.exports = { checkThis, checkSelf, checkWindow, checkGlobal, contextHasPostMessage, selfHasPostMessage }
  `
  const sesifyConfig = {
    resources: {
      'test': {
        globals: {
          postMessage: true,
        }
      }
    }
  }

  global.postMessage = () => { throw new Error('this should never be called') }
  const result = await testCodeInNonEntryBundle(t, moduleContent, sesifyConfig)
  delete global.postMessage

  // this is how it behaves in browser via browserify
  t.deepEqual(result, {
    // "this" is module.exports
    checkThis: false,
    checkSelf: true,
    checkWindow: true,
    checkGlobal: true,
    contextHasPostMessage: true,
    selfHasPostMessage: true,
  }, 'test result matches expected')

})

async function testCodeInNonEntryBundle (t, code, sesifyConfig = {}) {
  const files = [{
    // id must be full path
    id: './apple.js',
    file: './apple.js',
    deps: {
      'test': './node_modules/test/index.js'
    },
    source: 'global.testResult = require("test")',
    entry: true
  }, {
    // non-entry
    id: './node_modules/test/index.js',
    file: './node_modules/test/index.js',
    deps: {},
    source: code,
  }]
  
  const bundle = await createBundleFromRequiresArray(files, { sesifyConfig })

  global.testResult = undefined

  try {
    eval(bundle)
  } catch (err) {
    t.fail(`eval of bundle failed:\n${err.stack || err}`)
  }

  return global.testResult
}