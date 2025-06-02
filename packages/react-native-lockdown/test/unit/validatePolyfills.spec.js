const test = require('ava')
const path = require('node:path')
const { validatePolyfills } = require('../../src/index')

test('validatePolyfills - valid polyfills', (t) => {
  const polyfills = [path.resolve('polyfill1.js'), path.resolve('polyfill2.js')]
  t.notThrows(() => validatePolyfills(polyfills))
})

test('validatePolyfills - invalid polyfills (not an array)', (t) => {
  t.throws(() => validatePolyfills('not-an-array'), {
    instanceOf: Error,
    message:
      'Expected polyfills to be an array of strings, but received string',
  })
})

test('validatePolyfills - invalid polyfill (not a string)', (t) => {
  const polyfills = [path.resolve('polyfill1.js'), 123]
  const error = t.throws(() => validatePolyfills(polyfills), {
    instanceOf: Error,
    message:
      'Expected polyfills to be an array of strings, but received number',
  })
  t.is(
    error.message,
    'Expected polyfills to be an array of strings, but received number'
  )
})

test('validatePolyfills - invalid polyfill (function)', (t) => {
  const polyfills = [path.resolve('polyfill1.js'), () => {}]
  const error = t.throws(() => validatePolyfills(polyfills), {
    instanceOf: Error,
    message: `Expected polyfills to be an array of strings, but found a function. Looks like you're passing react-native/js-polyfills but not calling the function they export. Yes, it's not very intuitive, but it is what it is.`,
  })
  t.is(
    error.message,
    `Expected polyfills to be an array of strings, but found a function. Looks like you're passing react-native/js-polyfills but not calling the function they export. Yes, it's not very intuitive, but it is what it is.`
  )
})

test('validatePolyfills - invalid polyfill (not a resolved path)', (t) => {
  const polyfills = [path.resolve('polyfill1.js'), 'polyfill2']
  const error = t.throws(() => validatePolyfills(polyfills), {
    instanceOf: Error,
    message:
      'Polyfill must be a resolved path, not just a package name: polyfill2',
  })
  t.is(
    error.message,
    'Polyfill must be a resolved path, not just a package name: polyfill2'
  )
})
