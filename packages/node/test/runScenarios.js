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
    await scenario.checkPostRun(t, result, err, scenario)
  }
})
