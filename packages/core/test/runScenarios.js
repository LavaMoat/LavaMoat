const test = require('ava')
const { loadScenarios } = require('./scenarios/index')
const { runScenario, runAndTestScenario } = require('./util')

test('Run scenarios', async (t) => {
  for await (const scenario of loadScenarios()) {
    console.log(`Running Core Scenario: ${scenario.name}`)
    const {scuttleGlobalThis, scuttleMore, scuttleGlobalThisExceptions} = scenario
    const additionalOpts = {scuttleGlobalThis, scuttleMore, scuttleGlobalThisExceptions}
    await runAndTestScenario(t, scenario, ({ scenario }) => runScenario({ scenario, ...additionalOpts }))
  }
})

test('Run scenarios with precompiled intializer', async (t) => {
  for await (const scenario of loadScenarios()) {
    console.log(`Running Core Scenario: ${scenario.name}`)
    const {scuttleGlobalThis, scuttleMore, scuttleGlobalThisExceptions} = scenario
    const additionalOpts = {scuttleGlobalThis, scuttleMore, scuttleGlobalThisExceptions, runWithPrecompiledModules: true}
    await runAndTestScenario(t, scenario, ({ scenario }) => runScenario({ scenario, ...additionalOpts }))
  }
})
