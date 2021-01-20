const { createScenarioFromScaffold } = require('../util.js')

module.exports = [
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'basic - bundle works',
      defineOne: () => {
        module.exports = require('two')(5)
      },
      defineTwo: () => {
        module.exports = function (n) { return n * 111 }
      },
      expectedResult: 555
    })
    return scenario
  }
]
