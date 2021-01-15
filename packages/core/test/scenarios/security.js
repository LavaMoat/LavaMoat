const { createScenarioFromScaffold } = require('../util.js')

module.exports = [
  async () => {
    const scenario = createScenarioFromScaffold({
      // prevent intrinsic modifications
      defineOne: () => {
        require('two')
        module.exports = { objectXyz: 'xyz' in Object, protoXyz: 'xyz' in Object.prototype }
      },
      defineTwo: () => {
        try { Object.xyz = 123 } catch (_) { }
        try { Object.protoype.xyz = 123 } catch (_) { }
      }
    })
    scenario.expectedResult = { objectXyz: false, protoXyz: false }
    scenario.name = 'security - prevent intrinsic modification'
    return scenario
  },
  async () => {
    const scenario = createScenarioFromScaffold({
      // limit platform API
      defineOne: () => {
        module.exports = typeof require('two') === 'function'
      },
      defineTwo: () => {
        try { module.exports = setTimeout } catch (_) {}
      }
    })
    scenario.expectedResult = false
    scenario.name = 'limit platform API'
    return scenario
  },
  async () => {
    const scenario = createScenarioFromScaffold({
      // prevent module exports mutation
      defineOne: () => {
        // trigger attack
        require('two')
        module.exports = require('three').action()
      },
      defineTwo: () => {
        try {
          require('three').action = () => true
        } catch (_) {}
      },
      defineThree: () => {
        module.exports.action = () => false
      }
    })
    scenario.expectedResult = false
    scenario.name = 'security - prevent module exports mutation'
    return scenario
  },
  async () => {
    const scenario = createScenarioFromScaffold({
      // prevent module exports prototype mutation
      defineOne: () => {
        // trigger attack
        require('two')
        module.exports = require('three').action()
      },
      defineTwo: () => {
        const victim = require('three')
        try {
          Object.getPrototypeOf(victim).action = () => true
        } catch (_) {}
      },
      defineThree: () => {
        const parent = {
          action: () => false
        }
        const child = Object.create(parent)
        module.exports = child
      }
    })
    scenario.expectedResult = false
    scenario.name = 'security - prevent module exports prototype mutation'
    return scenario
  }
]
