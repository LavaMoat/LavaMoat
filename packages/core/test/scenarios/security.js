const { createScenarioFromScaffold } = require('../util.js')

module.exports = [
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'security - prevent intrinsic modification',
      defineOne: () => {
        require('two')
        module.exports = { objectXyz: 'xyz' in Object, protoXyz: 'xyz' in Object.prototype }
      },
      defineTwo: () => {
        try { Object.xyz = 123 } catch (_) { }
        try { Object.protoype.xyz = 123 } catch (_) { }
      },
      expectedResult: { objectXyz: false, protoXyz: false }
    })
    return scenario
  },
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'security - limit platform API',
      defineOne: () => {
        module.exports = typeof require('two') === 'function'
      },
      defineTwo: () => {
        try { module.exports = setTimeout } catch (_) {}
      },
      expectedResult: false
    })
    return scenario
  }
  // async () => {
  //   const scenario = createScenarioFromScaffold({
  //     name: 'security - prevent module exports shallow mutation',
  //     defineOne: () => {
  //       // trigger attack
  //       require('two')
  //       module.exports = require('three').action()
  //     },
  //     defineTwo: () => {
  //       try {
  //         require('three').action = () => true
  //       } catch (_) {}
  //     },
  //     defineThree: () => {
  //       module.exports.action = () => false
  //     },
  //     expectedResult: false
  //   })
  //   return scenario
  // },
  // async () => {
  //   const scenario = createScenarioFromScaffold({
  //     name: 'security - prevent module exports prototype mutation',
  //     defineOne: () => {
  //       // trigger attack
  //       require('two')
  //       module.exports = require('three').action()
  //     },
  //     defineTwo: () => {
  //       const victim = require('three')
  //       try {
  //         Object.getPrototypeOf(victim).action = () => true
  //       } catch (_) {}
  //     },
  //     defineThree: () => {
  //       const parent = {
  //         action: () => false
  //       }
  //       const child = Object.create(parent)
  //       module.exports = child
  //     },
  //     expectedResult: false
  //   })
  //   return scenario
  // }
]
