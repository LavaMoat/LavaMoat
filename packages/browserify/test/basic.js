const test = require('tape-promise').default(require('tape'))
const pify = require('pify')

const { createBundleFromRequiresArrayPath, createBundleFromEntry } = require('./util')
const { generatePrelude } = require('../src/index')


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

// test('basic - config and bundle', async (t) => {
//   const basicSesifyPrelude = generatePrelude()
//   const bundle = await createBundleFromEntry(__dirname + '/fixtures/nothing.js')
//   t.assert(basicSesifyPrelude.length > 10, 'prelude not empty')
//   t.assert(bundle.includes(basicSesifyPrelude))
// })
