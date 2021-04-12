const test = require('ava')
const {
  runScenario
} = require('./util')
const {
  createScenarioFromScaffold,
  runAndTestScenario
} = require('lavamoat-core/test/util')

test('globals - process is properly injected', async (t) => {
  const scenario = createScenarioFromScaffold({
    defineOne: () => {
      module.exports = process.browser
    },
    expectedResult: true,
    config: {
      resources: {
        one: {
          packages: {
            process: true
          }
        }
      }
    }
  })
  await runAndTestScenario(t, scenario, runScenario)
})