const { createScenarioFromScaffold } = require('../util.js')

module.exports = [
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'globalWrites - deep endow',
      defineOne: () => {
        module.exports = require('two')
      },
      defineTwo: () => {
        global.xyz = true
        module.exports = require('three')
      },
      defineThree: () => {
        module.exports = global.xyz
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
      expectedResult: true,
      shouldRunInCore: false
    })
    return scenario
  }
]
