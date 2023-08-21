const test = require('ava')
const {
  createScenarioFromScaffold,
  runScenario
} = require('./util')

test('circularDeps - multi-module circular deps dont inf loop', async (t) => {
  const scenario = createScenarioFromScaffold({
    defineOne: () => {
      module.exports = require('two')
    },
    defineTwo: () => {
      module.exports = require('three')
    },
    defineThree: () => {
      require('one')
      module.exports = 42
    },
    config: {
    resources: {
      three: {
        packages: {
          one: true,
        }
      }
    }
  }
  })
  const testResult = await runScenario({ scenario })

  t.is(testResult, 42, 'expected result, did not error')
})
