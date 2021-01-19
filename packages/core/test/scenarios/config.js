const { createScenarioFromScaffold } = require('../util.js')

module.exports = [
  // async () => {
  //   const scenario = createScenarioFromScaffold({
  //     name: 'config - deep endowments',
  //     defineEntry: () => {
  //       globalThis.exampleGlobal = 40
  //       const testResult = require('one')
  //       console.log(JSON.stringify(testResult, null, 2))
  //     },
  //     defineOne: () => {
  //       module.exports = { ...require('two'), one: typeof globalThis.exampleGlobal }
  //     },
  //     defineTwo: () => {
  //       module.exports = { ...require('three'), two: typeof globalThis.exampleGlobal }
  //     },
  //     defineThree: () => {
  //       module.exports = { three: typeof globalThis.exampleGlobal }
  //     },
  //     config: {
  //       resources: {
  //         three: {
  //           globals: {
  //             exampleGlobal: true
  //           }
  //         }
  //       }
  //     }
  //   })
  //   scenario.expectedResult = {
  //     one: 'undefined',
  //     two: 'undefined',
  //     three: 'number'
  //   }
  //   return scenario
  // },
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'config - dunder proto not allowed in globals path',
      config: {
        resources: {
          'one': {
            globals: {
              'globalThis.__proto__': true
            }
          }
        }
      },
      expectedFailure: true
    })
    return scenario
  },
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'disable access to package',
      config: {
        resources: {
          one: {
            packages: {
              two: false
            }
          }
        }
      },
      expectedFailure: true
    })
    return scenario
  }
]
