const test = require('ava')
const { evaluateWithSourceUrl } = require('./util')
const { scuttle } = require('../src/scuttle')

const SCUTTLER_NAME_ERROR = {
  message:
    'LavaMoat - \'scuttlerName\' function "SCUTTLER" expected on globalRef.' +
    'To learn more visit https://github.com/LavaMoat/LavaMoat/pull/462.',
}

const getPropsGroups = (g) => ({
  all: Object.getOwnPropertyNames(g),
  configurables: Object.getOwnPropertyNames(g)
    // props that scuttling will agree to scuttle
    .filter(
      (p) =>
        Object.getOwnPropertyDescriptor(g, p).configurable ||
        Object.getOwnPropertyDescriptor(g, p).writable
    )
    // remove hardcoded props scuttling ignores on purpose
    .filter((p) => !['Compartment', 'Error', 'globalThis'].includes(p)),
})

const err = (intrinsic) =>
  'LavaMoat - property "' +
  intrinsic +
  '" of globalThis is inaccessible under ' +
  'scuttling mode. To learn more visit https://github.com/LavaMoat/LavaMoat/pull/360.'

test('scuttle - no opts', (t) => {
  const { vmGlobalThis } = evaluateWithSourceUrl('some-code', ';', {})
  const { all } = getPropsGroups(vmGlobalThis)
  all.forEach((p) => vmGlobalThis[p])
  scuttle(vmGlobalThis)
  all.forEach((p) => vmGlobalThis[p])
  t.pass()
})

test('scuttle - opts as bool', (t) => {
  const { vmGlobalThis } = evaluateWithSourceUrl('some-code', ';', {})
  const { all, configurables } = getPropsGroups(vmGlobalThis)
  all.forEach((p) => vmGlobalThis[p])
  scuttle(vmGlobalThis, false)
  all.forEach((p) => vmGlobalThis[p])
  scuttle(vmGlobalThis, true)
  all.forEach((p) =>
    configurables.includes(p)
      ? t.throws(() => vmGlobalThis[p], { message: err(p) })
      : vmGlobalThis[p]
  )
})

test('scuttle - opts as object', (t) => {
  const { vmGlobalThis } = evaluateWithSourceUrl('some-code', ';', {})
  const { all, configurables } = getPropsGroups(vmGlobalThis)
  all.forEach((p) => vmGlobalThis[p])
  scuttle(vmGlobalThis, {})
  all.forEach((p) => vmGlobalThis[p])
  scuttle(vmGlobalThis, { enabled: false })
  all.forEach((p) => vmGlobalThis[p])
  scuttle(vmGlobalThis, { enabled: true })
  all.forEach((p) =>
    configurables.includes(p)
      ? t.throws(() => vmGlobalThis[p], { message: err(p) })
      : vmGlobalThis[p]
  )
})

test('scuttle - exceptions', (t) => {
  const { vmGlobalThis } = evaluateWithSourceUrl('some-code', ';', {})
  const { all, configurables } = getPropsGroups(vmGlobalThis)
  all.forEach((p) => vmGlobalThis[p])
  scuttle(vmGlobalThis, {
    enabled: true,
    exceptions: ['/[a-zA-Z0-9]*Array/', 'RegExp'],
  })
  const exceptions = [
    'RegExp',
    'Array',
    'ArrayBuffer',
    'Uint8Array',
    'Int8Array',
    'Uint16Array',
    'Int16Array',
    'Uint32Array',
    'Int32Array',
    'Float32Array',
    'Float64Array',
    'Uint8ClampedArray',
    'BigUint64Array',
    'BigInt64Array',
    'SharedArrayBuffer',
  ]
  exceptions.forEach((p) => vmGlobalThis[p])
  all
    .filter((p) => !exceptions.includes(p))
    .forEach(
      (p) =>
        configurables.includes(p) &&
        t.throws(() => vmGlobalThis[p], { message: err(p) })
    )
})

test('scuttle - scuttle func', (t) => {
  const { vmGlobalThis } = evaluateWithSourceUrl('some-code', ';', {})
  const { all, configurables } = getPropsGroups(vmGlobalThis)
  all.forEach((p) => vmGlobalThis[p])
  let globalRef
  const cb = (realm, scuttle) => ((globalRef = realm), scuttle(realm))
  const opts = { enabled: true, scuttlerName: 'SCUTTLER' }
  t.throws(() => scuttle(vmGlobalThis, opts), SCUTTLER_NAME_ERROR)
  Object.defineProperty(vmGlobalThis, opts.scuttlerName, { value: cb })
  scuttle(vmGlobalThis, opts)
  t.is(
    globalRef,
    vmGlobalThis,
    'expect global reference to be the same as provided by the scuttler function'
  )
  all.forEach((p) =>
    configurables.includes(p)
      ? t.throws(() => vmGlobalThis[p], { message: err(p) })
      : vmGlobalThis[p]
  )
})

test('scuttle - resilient', (t) => {
  const { vmGlobalThis } = evaluateWithSourceUrl('some-code', ';', {})
  const { all, configurables } = getPropsGroups(vmGlobalThis)
  all.forEach((p) => vmGlobalThis[p])
  scuttle(vmGlobalThis, { enabled: true })
  all.forEach((p) =>
    configurables.includes(p)
      ? t.throws(() => vmGlobalThis[p], { message: err(p) })
      : vmGlobalThis[p]
  )
  t.throws(() => Object.defineProperty(vmGlobalThis, 'Array', { value: 111 }), {
    message: 'Cannot redefine property: Array',
  })
  vmGlobalThis.Array = 1
  all.forEach((p) =>
    configurables.includes(p)
      ? t.throws(() => vmGlobalThis[p], { message: err(p) })
      : vmGlobalThis[p]
  )
})
