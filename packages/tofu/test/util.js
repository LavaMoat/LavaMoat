const test = require('ava')
const { utils: { mergeConfig, mergeConfigEntire, objToMap, mapToObj } } = require('../src/index')

testMergePartial('upgrades reads to writes', {
  abc: 'write',
  xyz: 'read'
}, {
  abc: 'read',
  xyz: 'write'
}, {
  abc: 'write',
  xyz: 'write'
})

testMergePartial('adds new packages', {
  abc: 'write',
  xyz: 'read'
}, {
  def: 'read',
  ghi: 'write'
}, {
  abc: 'write',
  xyz: 'read',
  def: 'read',
  ghi: 'write'
})

testMergePartial('dedupe overlapping', {
  'abc.xyz': 'read'
}, {
  abc: 'read'
}, {
  abc: 'read'
})

testMergePartial('non-overlapping', {
  abc: 'read'
}, {
  'xyz.jkl': 'write'
}, {
  abc: 'read',
  'xyz.jkl': 'write'
})

function testMergePartial (label, configA, configB, expectedResultObj) {
  test(label, (t) => {
    const result = mergeConfig(objToMap(configA), objToMap(configB))
    const resultObj = mapToObj(result)
    t.deepEqual(resultObj, expectedResultObj)
  })
}