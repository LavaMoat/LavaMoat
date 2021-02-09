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
    await scenario.checkPostRun(t, result, err, scenario)
  }
})
