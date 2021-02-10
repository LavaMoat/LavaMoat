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
    await scenario.checkPostRun(t, result, err, scenario)
  }
})
