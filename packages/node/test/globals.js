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
    ],
  })
  const testResult = await runScenario({ scenario })
  t.is(Array.isArray(testResult), true)
  t.deepEqual(testResult.sort(), scenario.expectedResult.sort())
})
