const { createScenarioFromScaffold, autoConfigForScenario } = require('../util.js')

module.exports = [
  async () => {
    // from"react-devtools-core" hasOwnProperty
    const scenario = createScenarioFromScaffold({
      defineOne: () => {
        const two = require('two')
        // eslint-disable-next-line
        globalThis.hasOwnProperty.call
        // eslint-disable-next-line
        module.exports = two.check(globalThis)
      },
      defineTwo: () => {
        // eslint-disable-next-line
        module.exports.check = (target) => target.hasOwnProperty('Number')
      }
    })
    await autoConfigForScenario(scenario)
    scenario.expectedResult = true
    scenario.name = 'autogen - react-devtools-core hasOwnProperty'
    return scenario
  }
]
