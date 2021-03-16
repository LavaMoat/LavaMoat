const test = require('ava')
const makeGetEndowmentsForConfig = require('../src/makeGetEndowmentsForConfig.js')
const {
  createScenarioFromScaffold,
  runScenario
} = require('./util')

test('globals - ensure global property this-value unwrapped', async (t) => {
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
        return (this === scenario.globalThis)
      }
    },
    config: {
      resources: {
        one: {
          globals: {
            xyz: true
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

test('globals - ensure window.document getter behavior support', async (t) => {
  // compartment.globalThis.document would error because 'this' value is not window
  const scenario = createScenarioFromScaffold({
    defineOne: () => {
      const two = require('two')
      const xyz = document
      module.exports = two
    },
    defineTwo: () => {
      module.exports = document.location.href
    },
    context: {
      get document() {
        // node vm weird, sometimes calls with vm context instead of vm global this
        if (this !== scenario.globalThis && this !== scenario.vmContext) {
          // chrome: Uncaught TypeError: Illegal invocation
          throw new TypeError("'get document' called on an object that does not implement interface Window")
        }
        return {
          location: {
            href: 'beepboop.bong'
          }
        }
      }
    },
    config: {
      resources: {
        one: {
          globals: {
            document: true
          }
        },
        two: {
          globals: {
            'document.location.href': true
          }
        }
      }
    },
  })
  const testResult = await runScenario({ scenario })
  t.deepEqual(testResult, 'beepboop.bong', 'expected result, did not error')
})

test.only('globals - ensure circular refs on package compartment global', async (t) => {
  const scenario = createScenarioFromScaffold({
    defineEntry: () => {
      const testResult = xyz === globalThis
      console.log(JSON.stringify(testResult, null, 2))
    },
    context: {
      get xyz() {
        throw new TypeError('xyz getter should not be accessed')
      }
    },
    extraArgs: {
      kernelArgs: {
        globalThisRefs: ['xyz', 'globalThis']
      }
    }
  })
  const testResult = await runScenario({ scenario })
  t.is(testResult, true, 'xyz references globalThis')
})