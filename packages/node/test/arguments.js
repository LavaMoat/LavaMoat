// const test = require('ava')
// const { runScenario } = require('./util')
// const { createScenarioFromScaffold, runAndTestScenario } = require('lavamoat-core/test/util')

// We should test for these properly

// test('arguments - lavamoat command aliases work - autoconfig', async (t) => {
//   const scenario = createScenarioFromScaffold({
//     defineOne: () => {
//       module.exports = 5
//     },
//     expectedResult: 5,
//     opts: {
//       ar: true
//     }
//   })
//   const testResult = await runScenario({ scenario })
//   scenario.checkResult(t, testResult, scenario)
// })

// test('arguments - lavamoat command aliases work - advanced', async (t) => {
//   const scenario = createScenarioFromScaffold({
//     defineOne: () => {
//       module.exports = 5
//     },
//     expectedResult: 5,
//     opts: {
//       d: true,
//       dp: true
//     }
//   })
//   const testResult = await runScenario({ scenario })
//   scenario.checkResult(t, testResult, scenario)
// })

// disable this test for now, until we fix yargs strict for passing args to other files
// test('arguments - invalid lavamoat commands fail', async (t) => {
//   const scenario = createScenarioFromScaffold({
//     defineOne: () => {
//       module.exports = 5
//     },
//     opts: {
//       z: true,
//       c: true
//     },
//     expectedFailure: true
//   })
//   await runAndTestScenario(t, scenario, runScenario)
// })
