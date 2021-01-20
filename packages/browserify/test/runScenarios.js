const test = require('ava')
const { runScenario } = require('./util.js')
const { loadScenarios } = require('lavamoat-core/test/scenarios/index')

test('Run scenarios', async (t) => {
  for await (const scenario of loadScenarios()) {
    let result, err
    console.log(`Running Browserify Scenario: ${scenario.name}`)
    try {
      result = await runScenario({ scenario })
    } catch (e) {
      err = e
    }
    if (scenario.expectedFailure) {
      t.truthy(err, `Scenario fails as expected: ${err}`)
    } else {
      if (err) {    
        t.fail(`Unexpected error in scenario: ${scenario.name}`, err)
        throw (err)
      }
      t.deepEqual(result, scenario.expectedResult, `Scenario gives expected result ${scenario.name}`)
    }
  }
})
