const test = require('tape-promise').default(require('tape'))

const { createBundleFromRequiresArray } = require('./util')


test('attack - prevent primitive modification', async (t) => {
  const depsArray = [
    {
      "id": "/1.js",
      "source": "require('foo'); global.testResult = Object.xyz",
      "deps": { "foo": "/node_modules/2/index.js" },
      "entry": true
    },
    {
      "id": "/node_modules/2/index.js",
      "source": "try { Object.xyz = 123 } catch (_) { }",
      "deps": {}
    }
  ]
  
  const sesifyConfig = {}
  const result = await createBundleFromRequiresArray(depsArray, sesifyConfig)
  
  eval(result)
  t.equal(global.testResult, undefined)
})

test('attack - limit platform api', async (t) => {
  const depsArray = [
    {
      "id": "/1.js",
      "source": "global.testResult = require('foo')",
      "deps": { "foo": "/node_modules/2/index.js" },
      "entry": true
    },
    {
      "id": "/node_modules/2/index.js",
      "source": "module.exports = console",
      "deps": {}
    }
  ]
  
  const sesifyConfig = {}
  const result = await createBundleFromRequiresArray(depsArray, sesifyConfig)

  eval(result)
  t.equal(global.testResult, undefined)
})

test('attack - prevent module cache attack', async (t) => {
  const depsArray = [
    {
      "id": "/1.js",
      "source": "require('attacker'); global.testResult = require('check-if-hacked').check()",
      "deps": {
        "attacker": "/node_modules/2/index.js",
        "check-if-hacked": "/node_modules/3/index.js"
      },
      "entry": true
    },
    {
      "id": "/node_modules/2/index.js",
      "source": "try { require('check-if-hacked').check = () => true } catch (_) {}",
      "deps": {
        "check-if-hacked": "/node_modules/3/index.js"
      }
    },
    {
      "id": "/node_modules/3/index.js",
      "source": "module.exports.check = () => false",
      "deps": {}
    }
  ]
  
  const sesifyConfig = {}
  const result = await createBundleFromRequiresArray(depsArray, sesifyConfig)

  eval(result)
  t.equal(global.testResult, false)
})
