const test = require('tape')
const { utils: { mergeConfig, objToMap } } = require('../src/index')

testMerge('upgrades reads to writes', {
  'abc': 'write',
  'xyz': 'read',
}, {
  'abc': 'read',
  'xyz': 'write'
}, {
  'abc': 'write',
  'xyz': 'write',
})

testMerge('dedupe overlapping', {
  'abc.xyz': 'read',
}, {
  'abc': 'read',
}, {
  'abc': 'read',
})


testMerge('non-overlapping', {
  'abc': 'read',
}, {
  'xyz.jkl': 'write',
}, {
  'abc': 'read',
  'xyz.jkl': 'write',
})


function testMerge (label, configA, configB, expectedResultObj) {
  test(label, (t) => {
    const result = mergeConfig(objToMap(configA), objToMap(configB))
    const resultSorted = [...result.entries()].sort(sortBy(0))
    const expectedSorted = Object.entries(expectedResultObj).sort(sortBy(0))
  
    t.deepEqual(resultSorted, expectedSorted)
    t.end()
  })
}

function sortBy(key) {
  return (a,b) => {
    const vA = a[key], vB = b[key]
    if (vA === vB) return 0
    return vA > vB ? 1 : -1
  }
}
