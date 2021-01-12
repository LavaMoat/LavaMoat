/* eslint-disable no-undef, no-unused-vars, no-unused-expressions, no-extend-native */
const test = require('ava')
const { createScenarioFromScaffold, autoConfigForScenario } = require('../util.js')

module.exports = [
  async () => {
    // from"react-devtools-core" hasOwnProperty
    const scenario = createScenarioFromScaffold({
      defineOne: () => {
        const two = require('two')
        globalThis.hasOwnProperty.call
        module.exports = two.check(globalThis)
      },
      defineTwo: () => {
        // eslint-disable-next-line
        module.exports.check = (target) => target.hasOwnProperty('Number')
      }
    })
    await autoConfigForScenario(scenario)
    scenario.expectedResult = true
    scenario.name = 'react-devtools-core hasOwnProperty'
    return scenario
  }
]
