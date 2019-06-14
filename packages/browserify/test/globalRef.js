const test = require('tape-promise').default(require('tape'))
const pify = require('pify')

// const { generatePrelude } = require('../src/index')
const { wrapIntoBundle } = require('../src/sourcemaps')

const {
  createBundleFromRequiresArray,
  generateConfigFromFiles,
} = require('./util')

// const wrapModuleContent

test('globalRef - check default containment', async (t) => {
  const moduleContent = `
  let objCheckThis, objCheckSelf, objCheckGlobal, exportsCheck, moduleCheck

  try { objCheckThis = this.Object === Object } catch (_) { }
  try { objCheckSelf = self.Object === Object } catch (_) { }
  try { objCheckGlobal = global.Object === Object } catch (_) { }
  try { exportsCheck = exports === this } catch (_) { }
  try { moduleCheck = module === this } catch (_) { }
  
  module.exports = { objCheckThis, objCheckSelf, objCheckGlobal, exportsCheck, moduleCheck }
  `
  
  const files = [{
    // id must be full path
    id: 1,
    file: './apple.js',
    deps: {
      'banana': 2
    },
    source: 'global.testResult = require("banana")',
    entry: true
  }, {
    // non-entry
    id: 2,
    file: './node_modules/banana/index.js',
    deps: {},
    source: moduleContent,
  }]
  const config = await generateConfigFromFiles({ files })
  const bundle = await createBundleFromRequiresArray(files, { sesifyConfig: config })

  const testHref = 'https://funky.town.gov/yolo?snake=yes'
  global.location = { href: testHref }
  eval(bundle)
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
    moduleCheck: false,
  }, 'test result matches expected')

  // // this is how it behaves in node (browserify or not)
  // t.deepEqual(global.testResult, {
  //   objCheckThis: false,
  //   objCheckSelf: undefined,
  //   objCheckGlobal: true,
  //   exportsCheck: true,
  //   moduleCheck: false,
  // }, 'test result matches expected')

  // // this is how it behaves in node (only toplevel in REPL)
  // t.deepEqual(global.testResult, {
  //   objCheckThis: true,
  //   objCheckSelf: undefined,
  //   objCheckGlobal: true,
  //   exportsCheck: false,
  //   moduleCheck: false,
  // }, 'test result matches expected')
})

// function moduleContent () {
//   let objCheckThis, objCheckSelf, objCheckGlobal, exportsCheck, moduleCheck

//   try { objCheckThis = this.Object === Object } catch (_) { }
//   try { objCheckSelf = self.Object === Object } catch (_) { }
//   try { objCheckGlobal = global.Object === Object } catch (_) { }
//   try { exportsCheck = exports === this } catch (_) { }
//   try { moduleCheck = module === this } catch (_) { }
  
//   module.exports = { objCheckThis, objCheckSelf, objCheckGlobal, exportsCheck, moduleCheck }
// }
