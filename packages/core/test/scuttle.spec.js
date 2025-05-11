const test = require('ava')
const { evaluateWithSourceUrl } = require('./util')

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
    .filter((p) => !avoidForLavaMoatCompatibility.includes(p)),
})

const { scuttle, avoidForLavaMoatCompatibility } = (function () {
  function fakeCompartment() {
    return {
      globalThis: {
        Infinity: globalThis['Infinity'],
        undefined: globalThis['undefined'],
        isFinite: globalThis['isFinite'],
        isNaN: globalThis['isNaN'],
        parseFloat: globalThis['parseFloat'],
        parseInt: globalThis['parseInt'],
        decodeURI: globalThis['decodeURI'],
        decodeURIComponent: globalThis['decodeURIComponent'],
        encodeURI: globalThis['encodeURI'],
        encodeURIComponent: globalThis['encodeURIComponent'],
        Array: globalThis['Array'],
        ArrayBuffer: globalThis['ArrayBuffer'],
        BigInt: globalThis['BigInt'],
        BigInt64Array: globalThis['BigInt64Array'],
        BigUint64Array: globalThis['BigUint64Array'],
        Boolean: globalThis['Boolean'],
        DataView: globalThis['DataView'],
        EvalError: globalThis['EvalError'],
        Float16Array: globalThis['Float16Array'],
        Float32Array: globalThis['Float32Array'],
        Float64Array: globalThis['Float64Array'],
        Int8Array: globalThis['Int8Array'],
        Int16Array: globalThis['Int16Array'],
        Int32Array: globalThis['Int32Array'],
        Map: globalThis['Map'],
        Number: globalThis['Number'],
        Object: globalThis['Object'],
        Promise: globalThis['Promise'],
        Proxy: globalThis['Proxy'],
        RangeError: globalThis['RangeError'],
        ReferenceError: globalThis['ReferenceError'],
        Set: globalThis['Set'],
        String: globalThis['String'],
        SyntaxError: globalThis['SyntaxError'],
        TypeError: globalThis['TypeError'],
        Uint8Array: globalThis['Uint8Array'],
        Uint8ClampedArray: globalThis['Uint8ClampedArray'],
        Uint16Array: globalThis['Uint16Array'],
        Uint32Array: globalThis['Uint32Array'],
        URIError: globalThis['URIError'],
        WeakMap: globalThis['WeakMap'],
        WeakSet: globalThis['WeakSet'],
        Iterator: globalThis['Iterator'],
        AggregateError: globalThis['AggregateError'],
        JSON: globalThis['JSON'],
        Reflect: globalThis['Reflect'],
        escape: globalThis['escape'],
        unescape: globalThis['unescape'],
        lockdown: globalThis['lockdown'],
        harden: globalThis['harden'],
      },
    }
  }
  // set stub to globalThis so requiring scuttle.js works
  globalThis.Compartment = fakeCompartment
  // generate props to skip (same code as from scuttle.js)
  const avoidForLavaMoatCompatibility = (function (
    globalThisCompartment,
    globalThis
  ) {
    return (
      Object.getOwnPropertyNames(globalThisCompartment)
        // skip all intrinsics that a Compartment already grants
        .filter((a) => globalThisCompartment[a] === globalThis[a])
        // support LM,SES exported APIs and polyfills that LM counts on
        .concat(['Compartment', 'Error', 'globalThis'])
    )
  })(new Compartment().globalThis, globalThis)
  // require scuttle.js
  const { scuttle } = require('../src/scuttle')
  // revert global object to its original state
  globalThis.Compartment = undefined
  return { scuttle, avoidForLavaMoatCompatibility }
})()

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
  vmGlobalThis.AAA1 = vmGlobalThis.BBB1 = 111
  const { all, configurables } = getPropsGroups(vmGlobalThis)
  all.forEach((p) => vmGlobalThis[p])
  scuttle(vmGlobalThis, {
    enabled: true,
    exceptions: ['/^(AAA|BBB)1$/', 'FinalizationRegistry', 'SharedArrayBuffer'],
  })
  const exceptions = [
    'AAA1',
    'BBB1',
    'FinalizationRegistry',
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
  t.throws(
    () =>
      Object.defineProperty(vmGlobalThis, 'SharedArrayBuffer', { value: 111 }),
    {
      message: 'Cannot redefine property: SharedArrayBuffer',
    }
  )
  vmGlobalThis.Array = 1
  all.forEach((p) =>
    configurables.includes(p)
      ? t.throws(() => vmGlobalThis[p], { message: err(p) })
      : vmGlobalThis[p]
  )
})
