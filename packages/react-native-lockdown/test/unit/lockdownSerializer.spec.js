'use strict'

/**
 * @import {TestFn} from 'ava'
 * @import {LockdownSerializerConfig} from '../../src/lockdown-serializer.js'
 */

const test = /** @type {TestFn} */ (/** @type {unknown} */ (require('ava')))
const path = require('node:path')
const { lockdownSerializer } = require('../../src/index')

// Test lockdownSerializer
test('lockdownSerializer - default', (t) => {
  /** @type {LockdownSerializerConfig} */
  const originalConfig = {}
  const config = lockdownSerializer({}, originalConfig)
  const polyfills = config.getPolyfills({ platform: null })
  const sesPath = require.resolve('ses/hermes')
  t.is(typeof config.getRunModuleStatement, 'function')
  t.is(typeof config.getPolyfills, 'function')
  t.true(polyfills.length > 1)
  t.true(polyfills.some((p) => p === sesPath))
  t.true(polyfills.some((p) => p.endsWith('repair.js')))
})

test('lockdownSerializer - hermes true', (t) => {
  const originalConfig = {
    getPolyfills: () => [],
  }
  const config = lockdownSerializer({ hermesRuntime: true }, originalConfig)
  const polyfills = config.getPolyfills({ platform: null })
  const sesPath = require.resolve('ses/hermes')
  t.true(polyfills.length > 1)
  t.true(polyfills.some((p) => p === sesPath))
  t.true(polyfills.some((p) => p.endsWith('repair.js')))
})

test('lockdownSerializer - hermes false', (t) => {
  /** @type {LockdownSerializerConfig} */
  const originalConfig = {
    getPolyfills: () => [],
  }
  const config = lockdownSerializer({ hermesRuntime: false }, originalConfig)
  const polyfills = config.getPolyfills({ platform: null })
  const sesPath = require.resolve('ses')
  t.true(polyfills.length > 1)
  t.true(polyfills.some((p) => p === sesPath && !p.includes('hermes')))
  t.true(polyfills.some((p) => p.endsWith('repair.js')))
})

test('lockdownSerializer - with custom polyfills', (t) => {
  const customPolyfill = path.resolve(__dirname, 'fixtures/custom-polyfill.js')
  const originalConfig = {
    getPolyfills: () => [customPolyfill],
  }
  const config = lockdownSerializer({}, originalConfig)
  const polyfills = config.getPolyfills({ platform: null })
  const sesPath = require.resolve('ses/hermes')
  t.true(polyfills.includes(customPolyfill))
  t.true(polyfills.length > 1)
  t.true(polyfills.some((p) => p === sesPath))
  t.true(polyfills.some((p) => p.endsWith('repair.js')))
})

test('lockdownSerializer - getRunModuleStatement for entry file', (t) => {
  /** @type {LockdownSerializerConfig} */
  const originalConfig = {
    getRunModuleStatement: (id) => `__r(${id})`,
    getPolyfills: () => [],
  }
  const config = lockdownSerializer({}, originalConfig)
  const entryResult = config.getRunModuleStatement(0)
  t.true(entryResult.includes('hardenIntrinsics()'))
  t.true(entryResult.includes('__r(0)'))
  const nonEntryResult = config.getRunModuleStatement(1)
  t.is(nonEntryResult, '__r(1)')
})

test('lockdownSerializer - invalid getPolyfills', (t) => {
  const originalConfig = {
    getPolyfills: 'not-a-function',
  }
  // @ts-expect-error bad type
  t.throws(() => lockdownSerializer({}, originalConfig), {
    instanceOf: Error,
    message: 'Invalid options: getPolyfills must be a function',
  })
})

test('lockdownSerializer - snapshot', (t) => {
  /** @type {LockdownSerializerConfig} */
  const originalConfig = {
    getRunModuleStatement: (moduleId) => `customRun(${moduleId})`,
    getPolyfills: () => ['customPolyfill.js'],
  }
  const config = lockdownSerializer({}, originalConfig)
  t.snapshot(config)
})
