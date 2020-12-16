const test = require('ava')
const { utils: { mergeConfigPartial, mergeConfig, objToMap, mapToObj } } = require('../src/index')

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

testMerge('merge with resources', {
  'resources': {
    'babel': {
      'globals': {
        'abc': true,
        'xyz': false
      }
    }
  },
}, {
  'resources': {
    'babel': {
      'globals': {
        'def': true,
        'ghi': false
      }
    }
  },
}, {
  'resources': {
    'babel': {
      'globals': {
        'abc': true,
        'xyz': false,
        'def': true,
        'ghi': false
      }
    }
  },
})

function testMergePartial (label, configA, configB, expectedResultObj) {
  test(label, (t) => {
    const result = mergeConfigPartial(objToMap(configA), objToMap(configB))
    const resultObj = mapToObj(result)
    t.deepEqual(resultObj, expectedResultObj)
  })
}

function testMerge (label, configA, configB, expectedResultObj) {
  test(label, (t) => {
    const result = mergeConfig(JSON.stringify(configA), JSON.stringify(configB))
    t.deepEqual(result, JSON.stringify(expectedResultObj))
  })
}