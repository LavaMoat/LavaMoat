const test = require('ava')
const { runScenario } = require('./util')
const { loadScenarios } = require('lavamoat-core/test/scenarios/index')

test('Run scenarios', async (t) => {
  for await (const scenario of loadScenarios()) {
    const result = await runScenario({ scenario })
    t.is(result, scenario.expectedResult, `Scenario gives expected result ${scenario.name}`)
  }
})
