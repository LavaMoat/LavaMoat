const test = require('tape')
const { createBundleFromRequiresArray } = require('./util')


test('prevent module cache attack', (t) => {
  const path = __dirname + '/fixtures/deps-cache-attack.json'
  const sesifyConfig = {}
  createBundleFromRequiresArray(path, sesifyConfig, (err, result) => {
    if (err) return t.fail(err)
    try {
      eval(result)
      t.deepEqual(global.testResult, false)
    } catch (err) {
      t.fail(err)
    } finally {
      t.end()
    }
  })
})
