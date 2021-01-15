const test = require('ava')
const { loadScenarios } = require('./scenarios/index')
const { runScenario } = require('./util')

test('Run scenarios', async (t) => {
  for await (const scenario of loadScenarios()) {
    const result = await runScenario({ scenario })
    t.deepEqual(result, scenario.expectedResult, `Scenario gives expected result ${scenario.name}`)
  }
})
