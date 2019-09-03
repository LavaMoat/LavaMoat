const test = require('tape-promise').default(require('tape'))
const clone = require('clone')

const { generatePrelude } = require('../src/index')
const {
  createBundleFromRequiresArray,
  createBundleFromRequiresArrayPath,
  createBundleFromEntry,
  generateConfigFromFiles
} = require('./util')

test('basic - bundle works', async (t) => {
  const path = __dirname + '/fixtures/basic-deps.json'
  const sesifyConfig = {}
  const result = await createBundleFromRequiresArrayPath(path, sesifyConfig)
  try {
    eval(result)
    t.equal(global.testResult, 555)
  } catch (err) {
    t.fail(err)
  }
})

test('basic - browserify plugin injects prelude', async (t) => {
  const basicSesifyPrelude = generatePrelude()
  const bundle = await createBundleFromEntry(__dirname + '/fixtures/nothing.js')
  t.assert(basicSesifyPrelude.length > 10, 'prelude not empty')
  t.assert(bundle.includes(basicSesifyPrelude))
})

test('basic - browserify bundle doesnt inject global', async (t) => {
  const bundle = await createBundleFromEntry(__dirname + '/fixtures/global.js')
  const hasGlobalInjection = bundle.includes('typeof global !== \"undefined\" ? global :')
  t.notOk(hasGlobalInjection, 'did not inject "global" ref')
})

test('basic - browserify bundle doesnt inject global in deps', async (t) => {
  const files = [{
    // id must be full path
    id: './apple.js',
    file: './apple.js',
    deps: {
      'banana': './node_modules/banana/index.js',
    },
    source: 'require("banana")',
    entry: true
  }, {
    // non-entry
    id: './node_modules/banana/index.js',
    file: './node_modules/banana/index.js',
    deps: {},
    source: 'global'
  }]
  const sesifyConfig = await generateConfigFromFiles({ files: clone(files) })
  const bundle = await createBundleFromRequiresArray(clone(files), { sesifyConfig })
  const hasGlobalInjection = bundle.includes('typeof global !== \\"undefined\\" ? global :')
  t.notOk(hasGlobalInjection, 'did not inject "global" ref')
})

test('basic - config and bundle', async (t) => {
  const files = [{
    // id must be full path
    id: './apple.js',
    file: './apple.js',
    deps: {
      'banana': './node_modules/banana/index.js',
    },
    source: 'global.testResult = require("banana")()',
    entry: true
  }, {
    // non-entry
    id: './node_modules/banana/index.js',
    file: './node_modules/banana/index.js',
    deps: {},
    source: 'module.exports = () => location.href'
  }]
  const sesifyConfig = await generateConfigFromFiles({ files: clone(files) })
  const prelude = generatePrelude({ sesifyConfig })
  const bundle = await createBundleFromRequiresArray(clone(files), { sesifyConfig })

  t.assert(prelude.includes('"banana": true'), 'prelude includes banana config')
  t.assert(bundle.includes(prelude), 'bundle includes expected prelude')

  const testHref = 'https://funky.town.gov/yolo?snake=yes'
  global.location = { href: testHref }
  eval(bundle)
  try {
    eval(bundle)
  } catch (err) {
    t.fail(`eval of bundle failed:\n${err.stack || err}`)
  }
  t.equal(global.testResult, testHref, 'test result matches expected')
})
