const test = require('ava')
const makeGetEndowmentsForConfig = require('../src/makeGetEndowmentsForConfig.js')
const {
  createScenarioFromScaffold,
  runScenario
} = require('./util')

test('globals - ensure window.document getter behavior support', async (t) => {
  // compartment.globalThis.document would error because 'this' value is not window
  const scenario = createScenarioFromScaffold({
    defineOne: () => {
      module.exports = {
        direct: globalThis.xyz,
        indirect: Reflect.getOwnPropertyDescriptor(globalThis, 'xyz').get()
      }
    },
    context: {
      get xyz() {
        debugger
        console.warn('PACKAGENAME:', this.packageName)
        console.warn('DEEQUAL', this === scenario.globalThis)
        return (this === scenario.globalThis)
      }
    },
    config: {
      resources: {
        one: {
          globals: {
            xyz: true,
            console: true
          }
        }
      }
    },
  })
  const testResult = await runScenario({ scenario })
  t.deepEqual(testResult, {
    direct: true,
    indirect: false
  }, 'expected result, did not error')
})