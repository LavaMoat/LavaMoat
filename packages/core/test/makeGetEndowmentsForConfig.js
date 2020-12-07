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
