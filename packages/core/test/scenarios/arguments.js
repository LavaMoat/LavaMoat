const { createScenarioFromScaffold } = require('../util.js')

module.exports = [
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'arguments - lavamoat command aliases work - autoconfig',
      defineOne: () => {
        module.exports = 5
      },
      expectedResult: 5,
      opts: {
        a: true
      },
      shouldRunInCore: false,
      // prevent from running in lavamoat node for now
      context: {
        bleep: 'bloop'
      }
    })
    return scenario
  },
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'arguments - lavamoat command aliases work - advanced',
      defineOne: () => {
        module.exports = 5
      },
      expectedResult: 5,
      opts: {
        p: true,
        pc: true,
        d: true,
        dc: true
      },
      shouldRunInCore: false,
      // prevent from running in lavamoat node for now
      context: {
        bleep: 'bloop'
      }
    })
    return scenario
  },
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'arguments - invalid lavamoat commands fail',
      defineOne: () => {
        module.exports = 5
      },
      opts: {
        z: true,
        c: true
      },
      shouldRunInCore: false,
      expectedFailure: true,
      // prevent from running in lavamoat node for now
      context: {
        bleep: 'bloop'
      }
    })
    return scenario
  }
]
