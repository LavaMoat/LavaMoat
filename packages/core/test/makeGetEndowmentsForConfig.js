const test = require('ava')
const makeGetEndowmentsForConfig = require('../src/makeGetEndowmentsForConfig.js')
const makeGeneralUtils = require('../src/makeGeneralUtils.js')

function prepareTest() {
  const { getEndowmentsForConfig } = makeGetEndowmentsForConfig(makeGeneralUtils())
  return getEndowmentsForConfig
}

test('getEndowmentsForConfig', (t) => {
  const getEndowmentsForConfig = prepareTest()
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
  const getEndowmentsForConfig = prepareTest()
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
  const getEndowmentsForConfig = prepareTest()
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

test('getEndowmentsForConfig - ensure window.document getter behavior support', (t) => {
  'use strict'
  // compartment.globalThis.document would error because 'this' value is not window
  const getEndowmentsForConfig = prepareTest()
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

  t.is(resultGlobal.xyz, sourceGlobal)
  t.is(getter.call(resultGlobal), sourceGlobal)
  t.is(getter.call(sourceGlobal), sourceGlobal)
  // ava seems to be forcing sloppy mode
  t.is(getter.call(), globalThis)
})

test('getEndowmentsForConfig - specify unwrap to', (t) => {
  'use strict'
  // compartment.globalThis.document would error because 'this' value is not window
  const unwrapTo = {}
  const getEndowmentsForConfig = prepareTest()
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

  t.is(resultGlobal.xyz, unwrapTo)
  t.is(getter.call(resultGlobal), unwrapTo)
  t.is(getter.call(sourceGlobal), sourceGlobal)
  t.is(getter.call(unwrapTo), unwrapTo)
  // ava seems to be forcing sloppy mode
  t.is(getter.call(), globalThis)
})

test('getEndowmentsForConfig - specify unwrap from, unwrap to', (t) => {
  'use strict'
  // compartment.globalThis.document would error because 'this' value is not window
  const unwrapTo = {}
  const unwrapFrom = {}
  const getEndowmentsForConfig = prepareTest()
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

  t.is(resultGlobal.xyz, resultGlobal)
  t.is(getter.call(resultGlobal), resultGlobal)
  t.is(getter.call(sourceGlobal), sourceGlobal)
  t.is(getter.call(unwrapTo), unwrapTo)
  t.is(getter.call(unwrapFrom), unwrapTo)
  // ava seems to be forcing sloppy mode
  t.is(getter.call(), globalThis)
})

test('getEndowmentsForConfig - endowing bind of a function', async (t) => {
  'use strict'
  const getEndowmentsForConfig = prepareTest()
  const sourceGlobal = {
    abc: function () { return this }
  }
  const config = {
    globals: {
      'abc.bind': true
    }
  }
  const resultGlobal = getEndowmentsForConfig(sourceGlobal, config)

  // the intermediate should actually be an object
  t.is(typeof resultGlobal.abc, 'object')
  // bind should work normally
  t.is(resultGlobal.abc.bind()(), undefined)
  t.is(resultGlobal.abc.bind(true)(), true)
  t.is(resultGlobal.abc.bind(42)(), 42)
  const xyz = {}
  t.is(resultGlobal.abc.bind(xyz)(), xyz)
})

test('getEndowmentsForConfig - ensure setTimeout calls dont trigger illegal invocation', (t) => {
  'use strict'
  // compartment.globalThis.document would error because 'this' value is not window
  const getEndowmentsForConfig = prepareTest()
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
