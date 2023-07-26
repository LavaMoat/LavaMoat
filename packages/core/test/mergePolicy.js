/* eslint-disable no-undef, no-unused-vars, no-unused-expressions, no-extend-native */
const test = require('ava')
const { mergePolicy } = require('../src/mergePolicy')

testMerge('merge with resources', {
  resources: {
    babel: {
      globals: {
        abc: true,
        xyz: false,
        'a.b.c': true,
      },
      builtin: {
        derp: true,
        qwerty: false,
      },
    },
  },
}, {
  resources: {
    babel: {
      globals: {
        def: true,
        ghi: false,
        'a.b': true,
      },
      builtin: {
        derp: true,
        qwerty: false,
      },
    },
  },
}, {
  resources: {
    babel: {
      globals: {
        abc: true,
        xyz: false,
        def: true,
        ghi: false,
        'a.b': true,
      },
      builtin: {
        derp: true,
        qwerty: false,
      },
    },
  },
})

testMerge('overrides to disallow', {
  resources: {
    babel: {
      globals: {
        abc: true,
        xyz: false,
        'a.b': true,
        'q.w.e': true,
      },
      builtin: {
        derp: true,
        qwerty: false,
      },
    },
  },
}, {
  resources: {
    babel: {
      globals: {
        abc: false,
        'a.b.c': false, // this is not supported
        'q.w': false,
      },
      builtin: {
        derp: false,
      },
    },
  },
},  {
  resources: {
    babel: {
      builtin: {
        derp: false,
        qwerty: false,
      },
      globals: {
        'a.b': true,
        abc: false,
        'q.w': false,
        xyz: false,
      },
    },
  },
})

function testMerge (label, configA, configB, expectedResultObj) {
  test(label, (t) => {
    const result = mergePolicy(configA, configB)
    t.deepEqual(result, expectedResultObj)
  })
}
