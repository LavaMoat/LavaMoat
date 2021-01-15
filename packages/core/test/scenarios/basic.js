const { createScenarioFromScaffold } = require('../util.js')

module.exports = [
  async () => {
    const scenario = createScenarioFromScaffold({
      // bundle works
      defineOne: () => {
        module.exports = require('two')(5)
      },
      defineTwo: () => {
        module.exports = function (n) { return n * 111 }
      }
    })
    scenario.expectedResult = 555
    scenario.name = 'basic - bundle works'
    return scenario
  }
]
