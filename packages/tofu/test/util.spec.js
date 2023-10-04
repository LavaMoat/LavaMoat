const test = require('ava')
const {
  utils: { mergePolicy, objToMap, mapToObj },
} = require('../src/index')

const testMergePartial = test.macro(
  (t, configA, configB, expectedResultObj) => {
    const result = mergePolicy(objToMap(configA), objToMap(configB))
    const resultObj = mapToObj(result)
    t.deepEqual(resultObj, expectedResultObj)
  }
)

test(
  'upgrades reads to writes',
  testMergePartial,
  {
    abc: 'write',
    xyz: 'read',
  },
  {
    abc: 'read',
    xyz: 'write',
  },
  {
    abc: 'write',
    xyz: 'write',
  }
)

test(
  'adds new packages',
  testMergePartial,
  {
    abc: 'write',
    xyz: 'read',
  },
  {
    def: 'read',
    ghi: 'write',
  },
  {
    abc: 'write',
    xyz: 'read',
    def: 'read',
    ghi: 'write',
  }
)

test(
  'dedupe overlapping',
  testMergePartial,
  {
    'abc.xyz': 'read',
  },
  {
    abc: 'read',
  },
  {
    abc: 'read',
  }
)

test(
  'non-overlapping',
  testMergePartial,
  {
    abc: 'read',
  },
  {
    'xyz.jkl': 'write',
  },
  {
    abc: 'read',
    'xyz.jkl': 'write',
  }
)
