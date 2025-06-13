'use strict'

/**
 * @import {TestFn} from 'ava'
 */

const test = /** @type {TestFn} */ (/** @type {unknown} */ (require('ava')))
const path = require('node:path')
const { assertPolyfills } = require('../../src/index')

test('assertPolyfills - valid polyfills', (t) => {
  const polyfills = [path.resolve('polyfill1.js'), path.resolve('polyfill2.js')]
  t.notThrows(() => assertPolyfills(polyfills))
})

test('assertPolyfills - invalid polyfills (not an array)', (t) => {
  t.throws(() => assertPolyfills('not-an-array'), {
    instanceOf: TypeError,
    message:
      'Expected polyfills to be an array of strings, but received: string',
  })
})

test('assertPolyfills - invalid polyfill (not a string)', (t) => {
  const polyfills = [path.resolve('polyfill1.js'), 123]
  t.throws(() => assertPolyfills(polyfills), {
    instanceOf: TypeError,
    message: 'Expected polyfill to be a string, but received: number',
  })
})

test('assertPolyfills - invalid polyfill (function)', (t) => {
  const polyfills = [path.resolve('polyfill1.js'), () => {}]
  t.throws(() => assertPolyfills(polyfills), {
    instanceOf: TypeError,
    message: `Expected polyfill to be a string, but received a function. Looks like you're passing @react-native/js-polyfills, but not calling the function they export. Yes, it's not very intuitive, but it is what it is.`,
  })
})

test('assertPolyfills - invalid polyfill (not a resolved path)', (t) => {
  const polyfills = [path.resolve('polyfill1.js'), 'polyfill2']
  t.throws(() => assertPolyfills(polyfills), {
    instanceOf: TypeError,
    message:
      'Expected polyfill to be a resolved path, not just a package name: polyfill2',
  })
})
