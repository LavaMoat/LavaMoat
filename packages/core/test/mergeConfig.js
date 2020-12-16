/* eslint-disable no-undef, no-unused-vars, no-unused-expressions, no-extend-native */
const test = require('ava')
const { mergeConfig } = require('../src/mergeConfig')

testMerge('merge with resources', {
  resources: {
    babel: {
      globals: {
        abc: true,
        xyz: false,
        'a.b.c': true
      },
      builtin: {
        derp: true,
        qwerty: false
      }
    }
  }
}, {
  resources: {
    babel: {
      globals: {
        def: true,
        ghi: false,
        'a.b': true
      },
      builtin: {
        derp: true,
        qwerty: false
      }
    }
  }
}, {
  resources: {
    babel: {
      globals: {
        abc: true,
        xyz: false,
        def: true,
        ghi: false,
        'a.b': true
      },
      builtin: {
        derp: true,
        qwerty: false
      }
    }
  }
})

function testMerge (label, configA, configB, expectedResultObj) {
  test(label, (t) => {
    const result = mergeConfig(configA, configB)
    t.deepEqual(result, expectedResultObj)
  })
}
