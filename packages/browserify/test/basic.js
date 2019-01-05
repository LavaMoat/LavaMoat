const test = require('tape')
const { createBundleFromRequiresArray, createBundleFromEntry } = require('./util')
const { generatePrelude } = require('../src/index')

test('basic - bundle works', (t) => {
  const path = __dirname + '/fixtures/basic-deps.json'
  const sesifyConfig = {}
  createBundleFromRequiresArray(path, sesifyConfig, (err, result) => {
    if (err) return t.fail(err)
    try {
      eval(result)
      t.equal(global.testResult, 555)
    } catch (err) {
      console.log(err.stack)
      t.fail(err)
    } finally {
      t.end()
    }
  })
})

test('basic - browserify plugin', (t) => {
  const basicSesifyPrelude = generatePrelude()
  createBundleFromEntry(__dirname + '/fixtures/nothing.js', (err, bundle) => {
    if (err) return t.fail(err)
    t.assert(bundle.includes(basicSesifyPrelude))
    t.end()
  })
})
