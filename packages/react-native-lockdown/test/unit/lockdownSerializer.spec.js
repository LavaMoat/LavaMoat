const test = require('ava')
const { lockdownSerializer } = require('../../src/index')

// Test lockdownSerializer
test('lockdownSerializer - default behavior', (t) => {
  const originalConfig = {}
  const config = lockdownSerializer({}, originalConfig)
  t.is(typeof config.getRunModuleStatement, 'function')
  t.is(typeof config.getPolyfills, 'function')
})

test('lockdownSerializer - invalid getPolyfills', (t) => {
  const originalConfig = {
    getPolyfills: 'not-a-function',
  }
  const error = t.throws(() => lockdownSerializer({}, originalConfig), {
    instanceOf: Error,
    message: 'serializer.getPolyfills must be a function',
  })
  t.is(error.message, 'serializer.getPolyfills must be a function')
})

test('lockdownSerializer - snapshot', (t) => {
  const originalConfig = {
    getRunModuleStatement: (moduleId) => `customRun(${moduleId})`,
    getPolyfills: () => ['customPolyfill.js'],
  }
  const config = lockdownSerializer({}, originalConfig)
  t.snapshot(config)
})
