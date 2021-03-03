const test = require('ava')
const { runScenario } = require('./util')
const { createScenarioFromScaffold } = require('lavamoat-core/test/util')

test('globals - has only the expected global circular refs', async (t) => {
  const scenario = createScenarioFromScaffold({
    defineOne: () => {
      const circularKeys = Reflect.ownKeys(globalThis)
        .filter(key => {
          const value = globalThis[key]
          return value === globalThis
        })
      module.exports = circularKeys
    },
    expectedResult: [
      'global',
      'globalThis'
    ]
  })
  const testResult = await runScenario({ scenario })
  t.is(Array.isArray(testResult), true)
  scenario.expectedResult.sort()
  scenario.checkResult(t, testResult.sort(), scenario)
})

test('globalRef - globalRef - check default containment', async (t) => {
  const scenario = createScenarioFromScaffold({
    name: 'globalRef - check default containment',
    defineOne: () => {
      const testResults = {}
      try { testResults.objCheckThis = this.Object === Object } catch (_) { }
      try { testResults.objCheckGlobal = global.Object === Object } catch (_) { }
      try { testResults.thisIsExports = exports === this } catch (_) { }
      module.exports = testResults
    },
    expectedResult: {
      objCheckThis: false,
      objCheckGlobal: true,
      thisIsExports: true
    }
  })
  const testResult = await runScenario({ scenario })
  scenario.checkResult(t, testResult, scenario)
})
