/* eslint-disable @typescript-eslint/no-unused-vars */
/* global abc: true, xyz, chrome */

const test = require('ava')
const { createScenarioFromScaffold, runScenario } = require('./util')

test('globals - ensure global property this-value unwrapped', async (t) => {
  // compartment.globalThis.document would error because 'this' value is not window
  const scenario = createScenarioFromScaffold({
    defineOne: () => {
      module.exports = {
        direct: globalThis.xyz,
        indirect: Reflect.getOwnPropertyDescriptor(globalThis, 'xyz').get(),
      }
    },
    context: {
      get xyz() {
        // node vm weird, sometimes calls with vm context instead of vm global this
        // debugger

        return this === scenario.globalThis || this === scenario.vmContext
      },
    },
    config: {
      resources: {
        one: {
          globals: {
            xyz: true,
          },
        },
      },
    },
  })
  const testResult = await runScenario({ scenario })
  t.deepEqual(
    testResult,
    {
      direct: true,
      indirect: false,
    },
    'expected result, did not error'
  )
})

test('globals - ensure window.document getter behavior support', async (t) => {
  // compartment.globalThis.document would error because 'this' value is not window
  const scenario = createScenarioFromScaffold({
    defineEntry: () => {
      const one = require('one')
      const zyx = document
      console.log(JSON.stringify(one, null, 2))
    },
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
          throw new TypeError(
            "'get document' called on an object that does not implement interface Window"
          )
        }
        return {
          location: {
            href: 'beepboop.bong',
          },
        }
      },
    },
    config: {
      resources: {
        one: {
          globals: {
            document: true,
          },
        },
        two: {
          globals: {
            'document.location.href': true,
          },
        },
      },
    },
  })
  const testResult = await runScenario({ scenario })
  t.is(testResult, 'beepboop.bong', 'expected result, did not error')
})

test('globals - ensure circular refs on package compartment global', async (t) => {
  const scenario = createScenarioFromScaffold({
    defineEntry: () => {
      const testResult = xyz === globalThis
      console.log(JSON.stringify(testResult, null, 2))
    },
    kernelArgs: {
      globalThisRefs: ['xyz', 'globalThis'],
    },
  })
  const testResult = await runScenario({ scenario })
  t.is(testResult, true, 'xyz references globalThis')
})

test('globals - ensure setTimeout calls dont trigger illegal invocation', async (t) => {
  const scenario = createScenarioFromScaffold({
    defineEntry: () => {
      const one = require('one')
      const y = setTimeout(() => {}, 300)
      console.log(one)
    },
    defineOne: () => {
      const x = setTimeout(() => {}, 300)
      module.exports = 123
    },
    config: {
      resources: {
        one: {
          globals: {
            setTimeout: true,
          },
        },
      },
    },
    context: {
      setTimeout() {
        if (this !== scenario.globalThis && this !== scenario.vmContext) {
          // chrome: Uncaught TypeError: Illegal invocation
          throw new TypeError(
            "'setTimeout' called on an object that does not implement interface Window"
          )
        }
      },
    },
  })
  const testResult = await runScenario({ scenario })
  t.is(testResult, 123, 'this value for setTimeout is correct')
})

test('globals - endowing bind on a function', async (t) => {
  'use strict'
  // bind requires this-value to be the function
  // this test was originally failing after lockdown
  // because our this-value unwrapping was not applied
  // to getters that resulted in functions, and
  // "Function.prototype.bind" was a getter as a result
  // of lockdown's override mistake workaround
  const scenario = createScenarioFromScaffold({
    defineOne: () => {
      const xyz = {}
      module.exports = {
        // the intermediate should actually be an object
        typeof: typeof abc === 'object',
        // bind should work normally
        isXyz: abc.bind(xyz)() === xyz,
        isUndefined: abc.bind()() === undefined,
        isTrue: abc.bind(true)() === true,
        is42: abc.bind(42)() === 42,
      }
    },
    context: {
      abc: function () {
        return this
      },
    },
    config: {
      resources: {
        one: {
          globals: {
            'abc.bind': true,
          },
        },
      },
    },
  })
  const testResult = await runScenario({ scenario })
  t.deepEqual(
    testResult,
    {
      typeof: true,
      isUndefined: true,
      isTrue: true,
      is42: true,
      isXyz: true,
    },
    'expected result, did not error'
  )
})

test('globals - endowing properties on the globalThis prototype chain', async (t) => {
  'use strict'
  // window.addEventListener is defined deep in the protoype chain
  const scenario = createScenarioFromScaffold({
    defineOne: () => {
      module.exports = globalThis.abc()
    },
    // modify the node GlobalPrototype
    beforeCreateKernel: ({ globalThis }) => {
      const globalProto = Reflect.getPrototypeOf(globalThis)
      globalProto.abc = () => 123
    },
    config: {
      resources: {
        one: {
          globals: {
            abc: true,
          },
        },
      },
    },
  })
  const testResult = await runScenario({ scenario })
  t.is(testResult, 123, 'expected result, did not error')
})

test('globals - explicitly disallowing properties on the globalThis', async (t) => {
  'use strict'
  const scenario = createScenarioFromScaffold({
    defineOne: () => {
      module.exports = globalThis.abc()
    },
    context: {
      abc: function () {
        return 42
      },
    },
    config: {
      resources: {
        one: {
          globals: {
            abc: false,
          },
        },
      },
    },
  })
  await t.throwsAsync(runScenario({ scenario }), {
    message: 'globalThis.abc is not a function',
  })
})

test('globals - explicitly disallowing properties on the globalThis via overrides', async (t) => {
  'use strict'
  const scenario = createScenarioFromScaffold({
    defineOne: () => {
      module.exports = globalThis.abc()
    },
    context: {
      abc: function () {
        return 42
      },
    },
    config: {
      resources: {
        one: {
          globals: {
            abc: true,
          },
        },
      },
    },
    configOverride: {
      resources: {
        one: {
          globals: {
            abc: false,
          },
        },
      },
    },
  })
  await t.throwsAsync(runScenario({ scenario }), {
    message: 'globalThis.abc is not a function',
  })
})

test('globals - nested property true.false.true', async (t) => {
  'use strict'
  // When this behavior changes, update /docs/policy.md
  const shared = {
    context: {
      a: { ok: 42, b: { c: () => 42, notOk: 41 } },
    },
    config: {
      resources: {
        one: {
          globals: {
            a: true,
            'a.b': false,
            'a.b.c': true,
          },
        },
      },
    },
  }
  const handlesAccess = createScenarioFromScaffold({
    defineOne: () => {
      module.exports = {
        a: !!globalThis.a,
        a_ok: !!globalThis.a.ok,
        a_b_notOk: !!globalThis.a.b.notOk,
        a_b_c: globalThis.a.b.c(),
      }
    },
    ...shared,
  })

  const testResult = await runScenario({ scenario: handlesAccess })
  t.is(testResult.a_b_c, 42)
  t.is(testResult.a, true)
  t.is(testResult.a_ok, true)
  t.is(testResult.a_b_notOk, false)
})

test('globals - circular refs taming', async (t) => {
  'use strict'
  const shared = {
    context: Object.create(null),
    config: {
      resources: {
        one: {
          globals: {
            globalThis: true,
            "console.warn": true,
          },
        },
      },
    },
  }
  const handlesAccess = createScenarioFromScaffold({
    defineOne: () => {
      module.exports = {
        globalThis: globalThis === globalThis.globalThis,
        warn: typeof globalThis.console.warn,
        info: typeof globalThis.console.info,
      }
    },
    ...shared,
  })

  const testResult = await runScenario({ scenario: handlesAccess })
  t.deepEqual(testResult, {
    globalThis: true,
    warn:  'function',
    info: 'undefined',
  })
})

test('globals - nested property false.true', async (t) => {
  'use strict'
  const shared = {
    context: {
      a: { b: { c: () => 42, notOk: 41 } },
      x: { notOk: 41, y: () => 42 },
    },
    config: {
      resources: {
        one: {
          globals: {
            'a.b': false,
            'a.b.c': true,
            x: false,
            'x.y': true,
          },
        },
      },
    },
  }
  const handlesAccess = createScenarioFromScaffold({
    defineOne: () => {
      globalThis.x.y()
      module.exports = globalThis.a.b.c()
      module.exports = {
        x_y: globalThis.x.y(),
        x_notOk: !!globalThis.x.notOk,
        a_b_notOk: !!globalThis.a.b.notOk,
        a_b_c: globalThis.a.b.c(),
      }
    },
    ...shared,
  })

  const testResult = await runScenario({ scenario: handlesAccess })
  t.is(testResult.a_b_c, 42)
  t.is(testResult.x_y, 42)
  t.is(testResult.a_b_notOk, false)
  t.is(testResult.x_notOk, false)
})

test.failing('globals - nested property true.false', async (t) => {
  'use strict'
  // When this behavior changes, update /docs/policy.md
  const shared = {
    context: {
      a: { ok: 42, b: { c: () => 42, notOk: 41 } },
    },
    config: {
      resources: {
        one: {
          globals: {
            a: true,
            'a.b': false,
          },
        },
      },
    },
  }
  const handlesAccess = createScenarioFromScaffold({
    defineOne: () => {
      module.exports = {
        a: !!globalThis.a,
        a_ok: !!globalThis.a.ok,
        a_b: !!globalThis.a.b,
      }
    },
    ...shared,
  })

  const testResult = await runScenario({ scenario: handlesAccess })
  t.is(testResult.a, true)
  t.is(testResult.a_ok, true)
  t.is(testResult.a_b, false)
})

test('globals - firefox addon chrome api lazy getter works', async (t) => {
  'use strict'
  const scenario = createScenarioFromScaffold({
    defineOne: () => {
      let testResult = typeof chrome !== 'undefined'
      testResult = chrome
      module.exports = testResult
    },
    // define lazy getter on chrome
    beforeCreateKernel: ({ globalThis }) => {
      function exportLazyGetter(object, prop, getter) {
        let redefine = (value) => {
          if (value === undefined) {
            delete object[prop]
          } else {
            Object.defineProperty(object, prop, {
              enumerable: true,
              configurable: true,
              writable: true,
              value,
            })
          }

          getter = null

          return value
        }

        Object.defineProperty(object, prop, {
          enumerable: true,
          configurable: true,

          get: function () {
            return redefine(getter.call(this))
          },

          set: function (value) {
            redefine(value)
          },
        })
      }
      exportLazyGetter(globalThis, 'chrome', () => 'xyz')
    },
    config: {
      resources: {
        one: {
          globals: {
            chrome: true,
          },
        },
      },
    },
    context: {
      chrome: {
        runtime: 'xyz',
      },
    },
  })
  const testResult = await runScenario({ scenario })
  t.is(testResult, 'xyz', 'expected result, did not error')
})
