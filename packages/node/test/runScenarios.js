const test = require('ava')
const { runScenario } = require('./util')
const { loadScenarios } = require('lavamoat-core/test/scenarios/index')
const { runAndTestScenario } = require('lavamoat-core/test/util')

test('Run scenarios', async (t) => {
  for await (const scenario of loadScenarios()) {
    if (!(Object.keys(scenario.context).length === 0 && scenario.context.constructor === Object)) continue
    console.log(`Running Node Scenario: ${scenario.name}`)
    await runAndTestScenario(t, scenario, runScenario)
  }
})
