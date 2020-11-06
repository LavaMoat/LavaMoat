const test = require('tape')
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
  t.equal(sourceGlobal.namespace.stringValue.includes('dab'), true)
  t.equal(resultGlobal.namespace.stringValue.includes('dab'), true)
  t.end()
})