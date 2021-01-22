const { createScenarioFromScaffold } = require('../util.js')

const testObj = {}

module.exports = [
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'endowments - bridged endowments matches original endowments object',
      defineOne: () => {
        const two = require('two')
        // eslint-disable-next-line
        module.exports = globalThis.testCheck(two)
      },
      defineTwo: () => {
        // eslint-disable-next-line
        module.exports = globalThis.testGet()
      },
      context: {
        testGet: () => {
          // console.log(`Test Get: ${testObj}`)
          return testObj
        },
        testCheck: (target) => {
          // console.log(`Test Check: target: ${target} testObj: ${testObj}`)
          return target === testObj
        }
      },
      config: {
        resources: {
          one: {
            globals: {
              testCheck: true
            }
          },
          two: {
            globals: {
              testGet: true
            }
          }
        }
      },
      expectedResult: true
    })
    return scenario
  }
]
