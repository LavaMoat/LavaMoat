const test = require('ava')

const {
  runScenario
} = require('./util')

const { createScenarioFromScaffold, runAndTestScenario } = require('lavamoat-core/test/util')

//We should test for these properly

test('arguments - lavamoat command aliases work - advanced', async (t) => {
  const scenario = createScenarioFromScaffold({
    defineOne: () => {
      module.exports = 5
    },
    expectedResult: 5,
    opts: {
      p: '',
      pp: true,
      d: true,
      dp: true
    }
  })
  await runAndTestScenario(t, scenario, runScenario)
})

test('arguments - invalid lavamoat commands fail', async (t) => {
  const scenario = createScenarioFromScaffold({
    defineOne: () => {
      module.exports = 5
    },
    opts: {
      z: true,
      c: true
    },
    expectedFailure: true,
  })
  await runAndTestScenario(t, scenario, runScenario)
})