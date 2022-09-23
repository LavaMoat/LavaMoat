const test = require('ava')
const { loadScenarios } = require('./scenarios/index')
const { runScenario, runAndTestScenario } = require('./util')

test('Run scenarios', async (t) => {
  for await (const scenario of loadScenarios()) {
    console.log(`Running Core Scenario: ${scenario.name}`)
    await runAndTestScenario(t, scenario, runScenario)
  }
})

test('Run scenarios with precompiled intializer', async (t) => {
  for await (const scenario of loadScenarios()) {
    console.log(`Running Core Scenario: ${scenario.name}`)
    await runAndTestScenario(t, scenario, ({ scenario }) => runScenario({ scenario, runWithPrecompiledModules: true }))
  }
})

test('Run scenarios with scuttleGlobalThis', async (t) => {
  for await (const scenario of loadScenarios()) {
    console.log(`Running Core Scenario: ${scenario.name}`)
    await runAndTestScenario(t, scenario, ({ scenario }) => runScenario({ scenario, scuttleGlobalThis: true }))
  }
})
