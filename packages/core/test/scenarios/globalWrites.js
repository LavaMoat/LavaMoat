const { createScenarioFromScaffold } = require('../util.js')

module.exports = [
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'globalWrites - deep endow',
      defineOne: () => {
        module.exports = require('two')
      },
      defineTwo: () => {
        globalThis.xyz = true
        module.exports = require('three')
      },
      defineThree: () => {
        module.exports = globalThis.xyz
      },
      config: {
        resources: {
          one: {
            packages: {
              two: true
            }
          },
          two: {
            globals: {
              xyz: 'write'
            },
            packages: {
              three: true
            }
          },
          three: {
            globals: {
              xyz: true
            }
          }
        }
      },
      expectedResult: true
    })
    return scenario
  },
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'globalWrites - and reads',
      defineOne: () => {
        module.exports = {
          type: typeof globalThis.xyz,
          value: globalThis.xyz
        }
      },
      config: {
        resources: {
          one: {
            globals: {
              xyz: 'write'
            }
          },
        }
      },
      // populate evaluation realm global
      beforeCreateKernel: (scenario) => {
        scenario.globalThis.xyz = 123
      },
      expectedResult: {
        type: 'number',
        value: 123,
      },
    })
    return scenario
  },
]
