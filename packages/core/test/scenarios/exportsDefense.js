const { createScenarioFromScaffold } = require('../util.js')

module.exports = [
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'exportsDefense - readOnly restrictions have override workaround fix - updates the property correctly',
      defineOne: () => {
        const two = require('two')
        const one = Object.create(two)
        one.xyz = 2
        module.exports = one.xyz
      },
      defineTwo: () => {
        module.exports = { xyz: 1 }
      },
      expectedResult: 2
    })
    return scenario
  },
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'exportsDefense - readOnly restrictions have override workaround fix - should not update the prototype',
      defineOne: () => {
        const two = require('two')
        const one = Object.create(two)
        one.xyz = 2
        module.exports = Object.getPrototypeOf(one).xyz
      },
      defineTwo: () => {
        module.exports = { xyz: 1 }
      },
      expectedResult: 1
    })
    return scenario
  },
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'exportsDefense - doesnt explode on null/undefined exports',
      defineOne: () => {
        module.exports = null
      },
      defineTwo: () => {
        module.exports = undefined
      },
      expectedResult: null
    })
    return scenario
  }
  // async () => {
  //   const scenario = createScenarioFromScaffold({
  //     name: 'exportsDefense - indirectly imported package should be readOnly',
  //     defineEntry: () => {
  //       const one = require('one')
  //       const thing = one.create()
  //       const thingProto = Reflect.getPrototypeOf(thing)
  //       // attempt to corrupt prototype
  //       try {
  //         thingProto.action = () => false
  //       } catch (_) {}
  //       const testResult = thing.action()
  //       console.log(JSON.stringify(testResult, null, 2))
  //     },
  //     defineOne: () => {
  //       const Thing = require('two')
  //       module.exports = {
  //         create: () => new Thing()
  //       }
  //     },
  //     defineTwo: () => {
  //       class Thing {}
  //       Thing.prototype.action = () => true
  //       module.exports = Thing
  //     },
  //     expectedResult: true
  //   })
  //   return scenario
  // }
]
