const test = require('ava')
const { runScenario } = require('./util')
const { loadScenarios } = require('lavamoat-core/test/scenarios/index')

test('Run scenarios', async (t) => {
  for await (const scenario of loadScenarios()) {
    let result, err
    if (!(Object.keys(scenario.context).length === 0 && scenario.context.constructor === Object)) continue
    console.log(`Running Node Scenario: ${scenario.name}`)
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
