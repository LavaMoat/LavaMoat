const test = require('ava')
const { loadScenarios } = require('./scenarios/index')
const { runScenario } = require('./util')

test('Run scenarios', async (t) => {
  for await (const scenario of loadScenarios()) {
    let result, err
    if (!scenario.shouldRunInCore) continue
    console.log(`Running Core Scenario: ${scenario.name}`)
    try {
      result = await runScenario({ scenario })
    } catch (e) {
      err = e
    }
    if (scenario.expectedFailure) {
      t.truthy(err, `Scenario fails as expected: ${scenario.name} - ${err}`)
    } else {
      if (err) {
        t.fail(`Unexpected error in scenario: ${scenario.name} - ${err}`)
        throw (err)
      }
      t.deepEqual(result, scenario.expectedResult, `Scenario gives expected result ${scenario.name}`)
    }
  }
})
