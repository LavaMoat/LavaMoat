const test = require('ava')
const {
  runScenario
} = require('./util')
const {
  createScenarioFromScaffold,
  runAndTestScenario
} = require('lavamoat-core/test/util')

// TODO: this should be resolving to a browserify dependency
test.skip('globals - process is properly injected', async (t) => {
  const scenario = createScenarioFromScaffold({
    defineOne: () => {
      module.exports = process.browser
    },
    expectedResult: true,
    config: {
      resources: {
        one: {
          packages: {
            'browserify>process': true
          }
        }
      }
    }
  })
  await runAndTestScenario(t, scenario, runScenario)
})