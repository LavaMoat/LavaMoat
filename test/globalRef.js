const test = require('tape-promise').default(require('tape'))
const clone = require('clone')

// const { generatePrelude } = require('../src/index')
const { wrapIntoBundle } = require('../src/sourcemaps')

const {
  createBundleFromRequiresArray,
  generateConfigFromFiles,
} = require('./util')

// const wrapModuleContent

test('globalRef - check default containment', async (t) => {
  const moduleContent = `
  let objCheckThis, objCheckSelf, objCheckGlobal, exportsCheck
  const isUndefined = {}

  try { objCheckThis = this.Object === Object } catch (_) { }
  try { objCheckSelf = self.Object === Object } catch (_) { }
  try { objCheckGlobal = global.Object === Object } catch (_) { }
  try { exportsCheck = exports === this } catch (_) { }

  isUndefined.global = typeof global === "undefined"
  isUndefined.self = typeof self === "undefined"
  isUndefined.window = typeof window === "undefined"
    
  module.exports = { objCheckThis, objCheckSelf, objCheckGlobal, exportsCheck, isUndefined }
  `

  const files = [{
    // id must be full path
    id: './apple.js',
    file: './apple.js',
    deps: {
      'banana': './node_modules/banana/index.js'
    },
    source: 'global.testResult = require("banana")',
    entry: true
  }, {
    // non-entry
    id: './node_modules/banana/index.js',
    file: './node_modules/banana/index.js',
    deps: {},
    source: moduleContent,
  }]
  
  const sesifyConfig = {}
  const bundle = await createBundleFromRequiresArray(files, { sesifyConfig })

  try {
    eval(bundle)
  } catch (err) {
    t.fail(`eval of bundle failed:\n${err.stack || err}`)
  }

  // this is how it behaves in browser via browserify
  t.deepEqual(global.testResult, {
    objCheckThis: false,
    objCheckSelf: true,
    objCheckGlobal: true,
    exportsCheck: true,
    isUndefined: {
      global: false,
      self: false,
      window: true,
    }
  }, 'test result matches expected')

  // // this is how it behaves in node (browserify or not)
  // t.deepEqual(global.testResult, {
  //   objCheckThis: false,
  //   objCheckSelf: undefined,
  //   objCheckGlobal: true,
  //   exportsCheck: true,
  // }, 'test result matches expected')

  // // this is how it behaves in node (only toplevel in REPL)
  // t.deepEqual(global.testResult, {
  //   objCheckThis: true,
  //   objCheckSelf: undefined,
  //   objCheckGlobal: true,
  //   exportsCheck: false,
  // }, 'test result matches expected')
})
