const test = require('tape')
const { createBundleFromRequiresArrayPath } = require('./util')


test('attack - prevent primitive modification', (t) => {
  const path = __dirname + '/fixtures/attack-primitives.json'
  const sesifyConfig = {}
  createBundleFromRequiresArrayPath(path, sesifyConfig, (err, result) => {
    if (err) return t.fail(err)
    try {
      eval(result)
      t.equal(global.testResult, undefined)
    } catch (err) {
      t.fail(err)
    } finally {
      t.end()
    }
  })
})

test('attack - limit platform api', (t) => {
  const path = __dirname + '/fixtures/attack-platform.json'
  const sesifyConfig = {}
  createBundleFromRequiresArrayPath(path, sesifyConfig, (err, result) => {
    if (err) return t.fail(err)
    try {
      eval(result)
      t.equal(global.testResult, undefined)
    } catch (err) {
      t.fail(err)
    } finally {
      t.end()
    }
  })
})

test('attack - prevent module cache attack', (t) => {
  const path = __dirname + '/fixtures/attack-deps-cache.json'
  const sesifyConfig = {}
  createBundleFromRequiresArrayPath(path, sesifyConfig, (err, result) => {
    if (err) return t.fail(err)
    try {
      eval(result)
      t.equal(global.testResult, false)
    } catch (err) {
      t.fail(err)
    } finally {
      t.end()
    }
  })
})
