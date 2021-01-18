const { createScenarioFromScaffold } = require('../util.js')

module.exports = [
  async () => {
    // deep endowments
    const scenario = createScenarioFromScaffold({
      defineEntry: () => {
        globalThis.exampleGlobal = 40
        const testResult = require('one')
        console.log(JSON.stringify(testResult, null, 2))
      },
      defineOne: () => {
        module.exports = { ...require('two'), one: typeof globalThis.exampleGlobal }
      },
      defineTwo: () => {
        module.exports = { ...require('three'), two: typeof globalThis.exampleGlobal }
      },
      defineThree: () => {
        module.exports = { three: typeof globalThis.exampleGlobal }
      },
      config: {
        resources: {
          three: {
            globals: {
              exampleGlobal: true
            }
          }
        }
      }
    })
    scenario.expectedResult = {
      one: 'undefined',
      two: 'undefined',
      three: 'number'
    }
    scenario.name = 'config - deep endowments'
    return scenario
  }
]
