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