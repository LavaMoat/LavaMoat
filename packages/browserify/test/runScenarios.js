const test = require('ava')
const { runScenario } = require('./util.js')
const { loadScenarios } = require('lavamoat-core/test/scenarios/index')
const { runAndTestScenario } = require('lavamoat-core/test/util')

test('Run scenarios with precompiled modules', async (t) => {
  for await (const scenario of loadScenarios()) {
    console.log(`Running Browserify Scenario: ${scenario.name}`)
    const {scuttleGlobalThis, scuttleGlobalThisExceptions} = scenario
    const additionalOpts = {scuttleGlobalThis, scuttleGlobalThisExceptions}
    await runAndTestScenario(t, scenario, ({ scenario }) => runScenario({ scenario, ...additionalOpts }))
  }
})

// not supported for now
// test('Run scenarios WITOUT precompiled modules', async (t) => {
//   for await (const scenario of loadScenarios()) {
//     console.log(`Running Browserify Scenario: ${scenario.name}`)
//     await runAndTestScenario(t, scenario, ({ scenario }) => runScenario({ scenario, bundleWithPrecompiledModules: false }))
//   }
// })
