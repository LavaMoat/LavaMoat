// eslint-disable-next-line no-unused-vars
/* global checkThis: true, checkSelf: true, checkWindow: true, checkGlobal: true */

const test = require('ava')
const { runScenario } = require('./util')
const {
  createScenarioFromScaffold,
  runAndTestScenario,
} = require('lavamoat-core/test/util')

test('globalRef - has only the expected global circular refs', async (t) => {
  const scenario = createScenarioFromScaffold({
    name: 'globalRef - has only the expected global circular refs',
    defineOne: () => {
      const circularKeys = Reflect.ownKeys(globalThis).filter((key) => {
        const value = globalThis[key]
        return value === globalThis
      })
      module.exports = circularKeys.sort()
    },
    expectedResult: ['window', 'self', 'global', 'globalThis', 'top', 'frames', 'parent'].sort(),
  })
  await runAndTestScenario(t, scenario, runScenario)
})

test('globals - circular refs taming', async (t) => {
  'use strict'
  const shared = {
    context: Object.defineProperties(
      Object.create(null), {
        top: {get: () => ({})},
        window: {get: () => ({})},
        frames: {get: () => ({})},
        parent: {get: () => ({})},
        self: {get: () => ({})},
      }),
    config: {
      resources: {
        one: {
          globals: {
            top: true,
            window: true,
            frames: true,
            parent: true,
            globalThis: true,
            self: true,
            "console.warn": true,
          },
        },
      },
    },
  }
  const handlesAccess = createScenarioFromScaffold({
    opts: {
      globalThisRefs: ['window', 'self', 'global', 'globalThis', 'top', 'frames', 'parent'],
    },
    defineOne: () => {
      module.exports = {
        top: globalThis === globalThis.top,
        window: globalThis === globalThis.window,
        frames: globalThis === globalThis.frames,
        parent: globalThis === globalThis.parent,
        globalThis: globalThis === globalThis.globalThis,
        self: globalThis === globalThis.self,
        warn: typeof globalThis.top.window.frames.parent.self.console.warn,
        info: typeof globalThis.top.window.frames.parent.self.console.info,
      }
    },
    ...shared,
  })

  const testResult = await runScenario({ scenario: handlesAccess })
  t.deepEqual(testResult, {
    top: true,
    window: true,
    frames: true,
    parent: true,
    globalThis: true,
    self:  true,
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
        testResults.objCheckSelf = self.Object === Object
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
      objCheckSelf: true,
      objCheckGlobal: true,
      thisIsExports: true,
    },
  })
  await runAndTestScenario(t, scenario, runScenario)
})

test('globalRef - ensure endowments are accessible on globals', async (t) => {
  const scenario = createScenarioFromScaffold({
    name: 'globalRef - ensure endowments are accessible on globals',
    defineOne: () => {
      const testResults = {}
      testResults.contextHasPostMessage = typeof postMessage !== 'undefined'
      testResults.selfHasPostMessage = !!self.postMessage
      try {
        testResults.checkThis = this.postMessage === postMessage
      } catch (err) {
        checkThis = err.message
      }
      try {
        testResults.checkSelf = self.postMessage === postMessage
      } catch (err) {
        checkSelf = err.message
      }
      try {
        testResults.checkWindow = window.postMessage === postMessage
      } catch (err) {
        checkWindow = err.message
      }
      try {
        testResults.checkGlobal = global.postMessage === postMessage
      } catch (err) {
        checkGlobal = err.message
      }
      module.exports = testResults
    },
    config: {
      resources: {
        $root$: {
          packages: {
            one: true,
          },
        },
        one: {
          globals: {
            postMessage: true,
          },
        },
      },
    },
    expectedResult: {
      // "this" is module.exports
      checkThis: false,
      checkSelf: true,
      checkWindow: true,
      checkGlobal: true,
      contextHasPostMessage: true,
      selfHasPostMessage: true,
    },
    context: {
      postMessage: () => {
        throw new Error('this should never be called')
      },
    },
  })
  await runAndTestScenario(t, scenario, runScenario)
})
