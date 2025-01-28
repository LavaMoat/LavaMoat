const test = require('ava')
const { runScenario } = require('./util')
const { createScenarioFromScaffold } = require('lavamoat-core/test/util')

test('globals - has only the expected global circular refs', async (t) => {
  const scenario = createScenarioFromScaffold({
    defineOne: () => {
      const circularKeys = Reflect.ownKeys(globalThis).filter((key) => {
        const value = globalThis[key]
        return value === globalThis
      })
      module.exports = circularKeys
    },
    expectedResult: ['global', 'globalThis'],
  })
  const testResult = await runScenario({ scenario })
  t.is(Array.isArray(testResult), true)
  scenario.expectedResult.sort()
  scenario.checkResult(t, testResult.sort(), scenario)
})

test('globals - circular refs taming', async (t) => {
  'use strict'
  const shared = {
    context: Object.defineProperties(
      Object.create(null), {
        global: {get: () => ({})},
      }),
    config: {
      resources: {
        one: {
          globals: {
            global: true,
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
        global: globalThis === globalThis.global,
        globalThis: globalThis === globalThis.globalThis,
        warn: typeof globalThis.global.console.warn,
        info: typeof globalThis.global.console.info,
      }
    },
    ...shared,
  })

  const testResult = await runScenario({ scenario: handlesAccess })
  t.deepEqual(testResult, {
    globalThis: true,
    global:  true,
    warn:  'function',
    info: 'undefined',
  })
})

test('globalRef - globalRef - check default containment', async (t) => {
  const scenario = createScenarioFromScaffold({
    name: 'globalRef - check default containment',
    defineOne: () => {
      const testResults = {}
      try {
        testResults.objCheckThis = this.Object === Object
      } catch (_) {}
      try {
        testResults.objCheckGlobal = global.Object === Object
      } catch (_) {}
      try {
        testResults.thisIsExports = exports === this
      } catch (_) {}
      module.exports = testResults
    },
    expectedResult: {
      objCheckThis: false,
      objCheckGlobal: true,
      thisIsExports: true,
    },
  })
  const testResult = await runScenario({ scenario })
  scenario.checkResult(t, testResult, scenario)
})

test('globals - basic override mistake taming is on', async (t) => {
  const scenario = createScenarioFromScaffold({
    defineOne: () => {
      Object.assign({}, { constructor: () => 1 })
      module.exports = 1
    },
    expectedResult: 1,
  })
  const testResult = await runScenario({ scenario })
  scenario.checkResult(t, testResult, scenario)
})
