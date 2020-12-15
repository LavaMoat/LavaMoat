const test = require('ava')
const { utils: { mergeConfigPartial, objToMap, mapToObj } } = require('../src/index')

testMerge('upgrades reads to writes', {
  abc: 'write',
  xyz: 'read'
}, {
  abc: 'read',
  xyz: 'write'
}, {
  abc: 'write',
  xyz: 'write'
})

testMerge('dedupe overlapping', {
  'abc.xyz': 'read'
}, {
  abc: 'read'
}, {
  abc: 'read'
})

testMerge('non-overlapping', {
  abc: 'read'
}, {
  'xyz.jkl': 'write'
}, {
  abc: 'read',
  'xyz.jkl': 'write'
})

function testMerge (label, configA, configB, expectedResultObj) {
  test(label, (t) => {
    const result = mergeConfigPartial(objToMap(configA), objToMap(configB))
    const resultObj = mapToObj(result)
    t.deepEqual(resultObj, expectedResultObj)
      })
}
