const test = require('ava')
const { runScenario } = require('./util.js')
const { loadScenarios } = require('lavamoat-core/test/scenarios/index')
const { runAndTestScenario } = require('lavamoat-core/test/util')

test('Run scenarios', async (t) => {
  for await (const scenario of loadScenarios()) {
    console.log(`Running Browserify Scenario: ${scenario.name}`)
    await runAndTestScenario(t, scenario, runScenario)
  }
})
