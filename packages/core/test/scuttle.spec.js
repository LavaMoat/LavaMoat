const test = require('ava')
const { evaluateWithSourceUrl } = require('./util')
const { scuttle } = require('../src/scuttle')

const SCUTTLER_NAME_ERROR = {
  message:
    'LavaMoat - \'scuttlerName\' function "SCUTTLER" expected on globalRef.' +
    'To learn more visit https://github.com/LavaMoat/LavaMoat/pull/462.',
}

const err = (intrinsic) =>
  'LavaMoat - property "' +
  intrinsic +
  '" of globalThis is inaccessible under ' +
  'scuttling mode. To learn more visit https://github.com/LavaMoat/LavaMoat/pull/360.'

function testScuttling(
  globalRef,
  intrinsics = ['Array', 'Int8Array', 'RegExp']
) {
  return intrinsics.some((intrinsic) => {
    try {
      new globalRef[intrinsic]()
      return false
    } catch (e) {
      if (err(intrinsic) === e.message) {
        return true
      }
      throw new Error('Unknown error thrown at testScuttling: ' + e.message)
    }
  })
}

test('scuttle - no opts', (t) => {
  const { vmGlobalThis } = evaluateWithSourceUrl('some-code', ';', {})
  t.is(testScuttling(vmGlobalThis), false, 'expect intrinsics to be accessible')
  scuttle(vmGlobalThis)
  t.is(testScuttling(vmGlobalThis), false, 'expect intrinsics to be accessible')
})

test('scuttle - opts as bool', (t) => {
  const { vmGlobalThis } = evaluateWithSourceUrl('some-code', ';', {})
  t.is(testScuttling(vmGlobalThis), false, 'expect intrinsics to be accessible')
  scuttle(vmGlobalThis, false)
  t.is(testScuttling(vmGlobalThis), false, 'expect intrinsics to be accessible')
  scuttle(vmGlobalThis, true)
  t.is(
    testScuttling(vmGlobalThis),
    true,
    'expect intrinsics to not be accessible'
  )
})

test('scuttle - opts as object', (t) => {
  const { vmGlobalThis } = evaluateWithSourceUrl('some-code', ';', {})
  t.is(testScuttling(vmGlobalThis), false, 'expect intrinsics to be accessible')
  scuttle(vmGlobalThis, {})
  t.is(testScuttling(vmGlobalThis), false, 'expect intrinsics to be accessible')
  scuttle(vmGlobalThis, { enabled: false })
  t.is(testScuttling(vmGlobalThis), false, 'expect intrinsics to be accessible')
  scuttle(vmGlobalThis, { enabled: true })
  t.is(
    testScuttling(vmGlobalThis),
    true,
    'expect intrinsics to not be accessible'
  )
})

test('scuttle - exceptions', (t) => {
  const { vmGlobalThis } = evaluateWithSourceUrl('some-code', ';', {})
  t.is(testScuttling(vmGlobalThis), false, 'expect intrinsics to be accessible')
  scuttle(vmGlobalThis, {
    enabled: true,
    exceptions: ['/[a-zA-Z0-8]*Array/', 'RegExp'],
  })
  t.is(
    testScuttling(vmGlobalThis, ['String']),
    true,
    'expect intrinsics to not be accessible'
  )
  t.is(testScuttling(vmGlobalThis), false, 'expect intrinsics to be accessible')
})

test('scuttle - scuttle func', (t) => {
  const { vmGlobalThis } = evaluateWithSourceUrl('some-code', ';', {})
  t.is(testScuttling(vmGlobalThis), false, 'expect intrinsics to be accessible')
  let globalRef
  const cb = (realm, scuttle) => ((globalRef = realm), scuttle(realm))
  t.throws(
    (_) => scuttle(vmGlobalThis, { enabled: true, scuttlerName: 'SCUTTLER' }),
    SCUTTLER_NAME_ERROR
  )
  Object.defineProperty(vmGlobalThis, 'SCUTTLER', { value: cb })
  scuttle(vmGlobalThis, { enabled: true, scuttlerName: 'SCUTTLER' })
  t.is(
    globalRef,
    vmGlobalThis,
    'expect global reference to be the same as provided by the scuttler function'
  )
  t.is(
    testScuttling(vmGlobalThis),
    true,
    'expect intrinsics to not be accessible'
  )
})

test('scuttle - resilient', (t) => {
  const { vmGlobalThis } = evaluateWithSourceUrl('some-code', ';', {})
  t.is(testScuttling(vmGlobalThis), false, 'expect intrinsics to be accessible')
  scuttle(vmGlobalThis, { enabled: true })
  t.is(
    testScuttling(vmGlobalThis),
    true,
    'expect intrinsics to not be accessible'
  )
  t.throws(
    (_) => Object.defineProperty(vmGlobalThis, 'Array', { value: 111 }),
    { message: 'Cannot redefine property: Array' }
  )
  vmGlobalThis.Array = 1
  t.is(
    testScuttling(vmGlobalThis, Object.getOwnPropertyNames(vmGlobalThis)),
    true,
    'expect intrinsics to not be accessible'
  )
})
