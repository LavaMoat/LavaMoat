const test = require('ava')
const makeGetEndowmentsForConfig = require('../src/makeGetEndowmentsForConfig.js')

test('getEndowmentsForConfig', (t) => {
  const { getEndowmentsForConfig } = makeGetEndowmentsForConfig()
  const sourceGlobal = {
    namespace: {
      stringValue: 'yabbadabbadoo'
    }
  }
  const config = {
    globals: {
      'namespace.stringValue.includes': true
    }
  }
  const resultGlobal = getEndowmentsForConfig(sourceGlobal, config)
  t.is(sourceGlobal.namespace.stringValue.includes('dab'), true)
  t.is(resultGlobal.namespace.stringValue.includes('dab'), true)
})

test('getEndowmentsForConfig - siblings', (t) => {
  const { getEndowmentsForConfig } = makeGetEndowmentsForConfig()
  const sourceGlobal = { Buffer }
  const config = {
    globals: {
      'Buffer.from': true,
      'Buffer.isBuffer': true
    }
  }
  const resultGlobal = getEndowmentsForConfig(sourceGlobal, config)
  {
    const sourceProp = Object.getOwnPropertyDescriptor(sourceGlobal.Buffer, 'from')
    const resultProp = Object.getOwnPropertyDescriptor(resultGlobal.Buffer, 'from')
    t.is(typeof resultProp.value, 'function')
    t.deepEqual(resultProp, {
      ...sourceProp,
      value: resultProp.value
    }, 'prop descriptor matches (except value)')
  }
  {
    const sourceProp = Object.getOwnPropertyDescriptor(sourceGlobal.Buffer, 'isBuffer')
    const resultProp = Object.getOwnPropertyDescriptor(resultGlobal.Buffer, 'isBuffer')
    t.is(typeof resultProp.value, 'function')
    t.deepEqual(resultProp, {
      ...sourceProp,
      value: resultProp.value
    }, 'prop descriptor matches (except value)')
  }
})

test('getEndowmentsForConfig - getter', (t) => {
  const { getEndowmentsForConfig } = makeGetEndowmentsForConfig()
  const sourceGlobal = { get abc () { return { xyz: 42 } } }
  const config = {
    globals: {
      'abc.xyz': true
    }
  }
  const resultGlobal = getEndowmentsForConfig(sourceGlobal, config)
  {
    const sourceProp = Object.getOwnPropertyDescriptor(sourceGlobal, 'abc')
    const resultProp = Object.getOwnPropertyDescriptor(resultGlobal, 'abc')
    t.deepEqual(resultProp.value, { xyz: 42 })
    const { enumerable, configurable } = sourceProp
    t.deepEqual(resultProp, {
      enumerable,
      configurable,
      value: resultProp.value,
      writable: true
    }, 'prop descriptor matches (except value)')
  }
})

test('getEndowmentsForConfig - ensure window.document getter behavior support', async (t) => {
  'use strict'
  // compartment.globalThis.document would error because 'this' value is not window
  const { getEndowmentsForConfig } = makeGetEndowmentsForConfig()
  const sourceGlobal = {
    get xyz() {
      return this
    }
  }
  const config = {
    globals: {
      xyz: true
    }
  }
  const resultGlobal = getEndowmentsForConfig(sourceGlobal, config)

  const getter = Reflect.getOwnPropertyDescriptor(resultGlobal, 'xyz').get

  t.deepEqual(resultGlobal.xyz, sourceGlobal)
  t.deepEqual(getter.call(resultGlobal), sourceGlobal)
  t.deepEqual(getter.call(sourceGlobal), sourceGlobal)
  // ava seems to be forcing sloppy mode
  t.deepEqual(getter.call(), globalThis)
})

test('getEndowmentsForConfig - specify unwrap to', async (t) => {
  'use strict'
  // compartment.globalThis.document would error because 'this' value is not window
  const unwrapTo = {}
  const { getEndowmentsForConfig } = makeGetEndowmentsForConfig()
  const sourceGlobal = {
    get xyz() {
      return this
    }
  }
  const config = {
    globals: {
      xyz: true
    }
  }
  const resultGlobal = getEndowmentsForConfig(sourceGlobal, config, unwrapTo)
  const getter = Reflect.getOwnPropertyDescriptor(resultGlobal, 'xyz').get

  t.deepEqual(resultGlobal.xyz, unwrapTo)
  t.deepEqual(getter.call(resultGlobal), unwrapTo)
  t.deepEqual(getter.call(sourceGlobal), sourceGlobal)
  t.deepEqual(getter.call(unwrapTo), unwrapTo)
  // ava seems to be forcing sloppy mode
  t.deepEqual(getter.call(), globalThis)
})

test('getEndowmentsForConfig - specify unwrap from, unwrap to', async (t) => {
  'use strict'
  // compartment.globalThis.document would error because 'this' value is not window
  const unwrapTo = {}
  const unwrapFrom = {}
  const { getEndowmentsForConfig } = makeGetEndowmentsForConfig()
  const sourceGlobal = {
    get xyz() {
      return this
    }
  }
  const config = {
    globals: {
      xyz: true
    }
  }
  const resultGlobal = getEndowmentsForConfig(sourceGlobal, config, unwrapTo, unwrapFrom)
  const getter = Reflect.getOwnPropertyDescriptor(resultGlobal, 'xyz').get

  t.deepEqual(resultGlobal.xyz, resultGlobal)
  t.deepEqual(getter.call(resultGlobal), resultGlobal)
  t.deepEqual(getter.call(sourceGlobal), sourceGlobal)
  t.deepEqual(getter.call(unwrapTo), unwrapTo)
  t.deepEqual(getter.call(unwrapFrom), unwrapTo)
  // ava seems to be forcing sloppy mode
  t.deepEqual(getter.call(), globalThis)
})

test.only('getEndowmentsForConfig - ensure setTimeout calls dont trigger illegal invocation', async (t) => {
  'use strict'
  // compartment.globalThis.document would error because 'this' value is not window
  const { getEndowmentsForConfig } = makeGetEndowmentsForConfig()
  const sourceGlobal = {
    setTimeout () { return this }
  }
  const config = {
    globals: {
      setTimeout: true
    }
  }
  const resultGlobal = getEndowmentsForConfig(sourceGlobal, config)
  t.is(resultGlobal.setTimeout(), sourceGlobal)
})
