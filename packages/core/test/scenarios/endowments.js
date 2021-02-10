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
  },
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'endowments - Date.now works in root and non-root',
      defineEntry: () => {
        const testResult = {
          root: Date.now(),
          non: require('one')
        }
        // standard test result serialization
        console.log(JSON.stringify(testResult, null, 2))
      },
      defineOne: () => {
        module.exports = Date.now()
      },
      checkResult: async (t, result, scenario) => {
        t.is(typeof result, 'object')
        t.is(typeof result.root, 'number')
        t.is(typeof result.non, 'number')
        t.is(isRecent(result.root), true)
        t.is(isRecent(result.non), true)
        function isRecent (time) {
          // more recent than 2020-01-01T00:00:00.000Z
          return time > 1577836800000
        }
      }
    })
    return scenario
  }
]
