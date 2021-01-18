const test = require('ava')
const { loadScenarios } = require('./scenarios/index')
const { runScenario } = require('./util')

test('Run scenarios', async (t) => {
  for await (const scenario of loadScenarios()) {
    let result, err
    try {
      result = await runScenario({ scenario })
    } catch (e) {
      err = e
    }
    if (scenario.expectedFailure) {
      t.truthy(err, `Scenario fails as expected: ${err}`)
    } else {
      if (err) {
        throw (err)
      }
      t.deepEqual(result, scenario.expectedResult, `Scenario gives expected result ${scenario.name}`)
    }
  }
})
