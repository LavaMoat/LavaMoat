const test = require('tape-promise').default(require('tape'))
const pify = require('pify')

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

test('basic - browserify plugin', async (t) => {
  const basicSesifyPrelude = generatePrelude()
  const bundle = await createBundleFromEntry(__dirname + '/fixtures/nothing.js')
  t.assert(basicSesifyPrelude.length > 10, 'prelude not empty')
  t.assert(bundle.includes(basicSesifyPrelude))
})

test('basic - config and bundle', async (t) => {
  const files = [{
    // id must be full path
    id: 1,
    file: './apple.js',
    deps: {
      'banana': 2
    },
    source: 'global.testResult = require("banana")()',
    entry: true
  }, {
    // non-entry
    id: 2,
    file: './node_modules/banana/index.js',
    deps: {},
    source: 'module.exports = () => location.href'
  }]
  const config = await generateConfigFromFiles({ files })
  const prelude = generatePrelude({ sesifyConfig: config })
  const bundle = await createBundleFromRequiresArray(files, { sesifyConfig: config })

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
