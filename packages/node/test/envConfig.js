const test = require('ava')

const { runScenario } = require('./util')

const { createScenarioFromScaffold } = require('lavamoat-core/test/util')

test('envConfig - intrinsic protoytype mutating package running in unfrozen realm does not pollute other package intrinsics', async (t) => {
  const scenario = createScenarioFromScaffold({
      defineOne: () => {
        const two = require('two')
        module.exports = {
          one: Function.prototype.xyz,
          two
        }
      },
      defineTwo: () => {
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
  t.deepEqual(testResult, scenario.expectedResult)
})