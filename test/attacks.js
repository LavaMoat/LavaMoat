const test = require('tape')
const { createBundleFromRequiresArray } = require('./util')


test('attack - prevent primitive modification', (t) => {
  const depsArray = [
    {
      "id": "a1b5af78",
      "source": "require('foo'); global.testResult = Object.xyz",
      "deps": { "foo": "b8f69fa5" },
      "entry": true
    },
    {
      "id": "b8f69fa5",
      "source": "try { Object.xyz = 123 } catch (_) { }",
      "deps": {}
    }
  ]
  
  const sesifyConfig = {}
  createBundleFromRequiresArray(depsArray, sesifyConfig, (err, result) => {
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
  const depsArray = [
    {
      "id": "a1b5af78",
      "source": "global.testResult = require('foo')",
      "deps": { "foo": "b8f69fa5" },
      "entry": true
    },
    {
      "id": "b8f69fa5",
      "source": "module.exports = console",
      "deps": {}
    }
  ]
  
  const sesifyConfig = {}
  createBundleFromRequiresArray(depsArray, sesifyConfig, (err, result) => {
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
  const depsArray = [
    {
      "id": "a1b5af78",
      "source": "require('attacker'); global.testResult = require('check-if-hacked').check()",
      "deps": {
        "attacker": "b8f69fa5",
        "check-if-hacked": "c4a5f69f"
      },
      "entry": true
    },
    {
      "id": "b8f69fa5",
      "source": "try { require('check-if-hacked').check = () => true } catch (_) {}",
      "deps": {
        "check-if-hacked": "c4a5f69f"
      }
    },
    {
      "id": "c4a5f69f",
      "source": "module.exports.check = () => false",
      "deps": {}
    }
  ]
  
  const sesifyConfig = {}
  createBundleFromRequiresArray(depsArray, sesifyConfig, (err, result) => {
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
