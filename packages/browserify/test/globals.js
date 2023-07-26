const test = require('ava')
const {
  runScenario,
  createBrowserifyScenarioFromScaffold,
} = require('./util')
const {
  runAndTestScenario,
} = require('lavamoat-core/test/util.js')

// TODO: this should be resolving to a browserify dependency
// eslint-disable-next-line ava/no-skip-test
test('globals - process is properly injected', async (t) => {
  const scenario = createBrowserifyScenarioFromScaffold({
    defineOne: () => {
      module.exports = process.browser
    },
    expectedResult: true,
    config: {
      resources: {
        one: {
          packages: {
            'browserify>process': true,
          },
        },
      },
    },
  })
  await runAndTestScenario(t, scenario, runScenario)
})
