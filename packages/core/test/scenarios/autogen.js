const { createScenarioFromScaffold, autoConfigForScenario } = require('../util.js')

module.exports = [
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'autogen - react-devtools-core hasOwnProperty',
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
      },
      expectedResult: true
    })
    await autoConfigForScenario({ scenario })
    return scenario
  }
]
