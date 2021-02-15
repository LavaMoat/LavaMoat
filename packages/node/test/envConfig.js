const test = require('ava')
const { runScenario } = require('./util')
const { createScenarioFromScaffold } = require('lavamoat-core/test/util')

test('envConfig - intrinsic prototype mutating package running in unfrozen realm does not pollute other package intrinsics', async (t) => {
  const scenario = createScenarioFromScaffold({
    defineOne: () => {
      const two = require('two')
      module.exports = {
        one: Function.prototype.xyz,
        two
      }
    },
    defineTwo: () => {
      /* eslint-disable-next-line */
      Function.prototype.xyz = 'Hello'
      module.exports = Function.prototype.xyz
    },
    expectedResult: {
      two: 'Hello'
    },
    configOverride: {
      resources: {
        two: {
          env: 'unfrozen'
        }
      }
    }
  })
  const testResult = await runScenario({ scenario })
  scenario.checkResult(t, testResult, scenario)
})

test('envConfig - module.exports from the same Realm as its Compartment', async (t) => {
  const scenario = createScenarioFromScaffold({
    defineOne: () => {
      const two = require('two')
      module.exports = {
        one: module.exports instanceof Object,
        two: two.isSameRealm,
        cross: two.defaultExportsObj instanceof Object
      }
    },
    defineTwo: () => {
      const defaultExportsObj = module.exports
      const isSameRealm = defaultExportsObj instanceof Object
      module.exports = {
        defaultExportsObj,
        isSameRealm
      }
    },
    expectedResult: {
      one: true,
      two: true,
      cross: false
    },
    configOverride: {
      resources: {
        two: {
          env: 'unfrozen'
        }
      }
    }
  })
  const testResult = await runScenario({ scenario })
  scenario.checkResult(t, testResult, scenario)
})
