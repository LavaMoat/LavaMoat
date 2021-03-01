const { createScenarioFromScaffold } = require('../util.js')

// const configOverride = {
//   resources: {
//     three: {
//       packages: {
//         two: true
//       }
//     }
//   }
// }

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
  //     },
  //     expectedResult: {
  //       one: 'undefined',
  //       two: 'undefined',
  //       three: 'number'
  //     }
  //   })
  //   return scenario
  // },
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'config - dunder proto not allowed in globals path',
      config: {
        resources: {
          one: {
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
      name: 'config - disable access to package',
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
  },
  // intended to test passing into JS API and not over file system
  // async () => {
  //   const scenario = createScenarioFromScaffold({
  //     name: 'config - applies override, provided as object',
  //     defineOne: () => {
  //       module.exports = require('three')
  //     },
  //     defineTwo: () => {
  //       module.exports = 555
  //     },
  //     defineThree: () => {
  //       module.exports = require('two')
  //     },
  //     configOverride,
  //     expectedResult: 555
  //   })
  //   return scenario
  // },
  // intended to test passing into JS API and not over file system
  // async () => {
  //   const scenario = createScenarioFromScaffold({
  //     name: 'config - applies override, provided as file path string',
  //     defineOne: () => {
  //       module.exports = require('three')
  //     },
  //     defineTwo: () => {
  //       module.exports = 555
  //     },
  //     defineThree: () => {
  //       module.exports = require('two')
  //     },
  //     // what's being written to disk
  //     configOverride,
  //     // what's being passed into run lavamoat
  //     opts: {
  //       policyOverride: 'policy-override.json'
  //     },
  //     expectedResult: 555
  //   })
  //   return scenario
  // },
  // intended to test passing into JS API and not over file system
  // async () => {
  //   const scenario = createScenarioFromScaffold({
  //     name: 'config - applies override, provided as function returning config object',
  //     defineOne: () => {
  //       module.exports = require('three')
  //     },
  //     defineTwo: () => {
  //       module.exports = 555
  //     },
  //     defineThree: () => {
  //       module.exports = require('two')
  //     },
  //     configOverride,
  //     opts: {
  //       policyOverride: () => configOverride
  //     },
  //     expectedResult: 555
  //   })
  //   return scenario
  // },
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'config - config validation fails: invalid "resources" key',
      config: {
        resourcessssss: {
          three: {
            packages: {
              two: true
            }
          }
        }
      },
      expectedFailure: true,
      defaultPolicy: false
    })
    return scenario
  },
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'config - config validation fails: invalid "packages" key',
      config: {
        resources: {
          three: {
            packagesssss: {
              two: true
            }
          }
        }
      },
      expectedFailure: true,
      defaultPolicy: false
    })
    return scenario
  },
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'config - config validation fails: invalid "globals" key',
      config: {
        resources: {
          three: {
            packages: {
              two: true
            },
            globalsss: {
              console: true
            }
          }
        }
      },
      expectedFailure: true,
      defaultPolicy: false
    })
    return scenario
  },
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'config - config validation fails: invalid "globals" value',
      config: {
        resources: {
          three: {
            packages: {
              two: true
            },
            globals: {
              console: false
            }
          }
        }
      },
      expectedFailure: true,
      defaultPolicy: false
    })
    return scenario
  },
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'config - config validation passes - everything valid',
      config: {
        resources: {
          '<root>': {
            packages: {
              two: true
            }
          },
          one: {
            packages: {
              two: true
            }
          },
          two: {
            packages: {
              three: true
            }
          }
        }
      },
      configOverride: {
        resources: {
          '<root>': {
            packages: {
              two: true
            }
          },
          two: {
            packages: {
              three: true
            },
            globals: {
              console: 'write'
            }
          }
        }
      }
    })
    return scenario
  }
]
