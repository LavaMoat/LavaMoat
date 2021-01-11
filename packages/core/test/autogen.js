/* eslint-disable no-undef, no-unused-vars, no-unused-expressions, no-extend-native */
const test = require('ava')
const { createScenarioFromScaffold, runScenario, autoConfigForScenario } = require('./util.js')

test('autogen - react-devtools-core hasOwnProperty', async (t) => {
  const scenario = createScenarioFromScaffold({
    defineOne: () => {
      const two = require('two')
      globalThis.hasOwnProperty.call
      module.exports = two.check(globalThis)
    },

    defineTwo: () => {
      module.exports.check = (target) => target.hasOwnProperty('Number')
    }
  })
  autoConfigForScenario(scenario)
  const result = await runScenario(scenario)
  t.is(result, true)
})