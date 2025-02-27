import '../../../src/preamble.js'

import test from 'ava'
import { keysOr } from '../../../src/util.js'
import { createGeneratePolicyMacros } from './policy-macros.js'

const { testPolicyForModule, testPolicyForScript, testPolicyForJSON } =
  createGeneratePolicyMacros(test)

// NOTE: All JSON fixtures are virtual filesystem snapshots and live in
// `../json-fixture/`

test('Node.js builtins', testPolicyForJSON, 'builtins.json')

test('kitchen sink', testPolicyForJSON, 'kitchen-sink.json', {
  expected: (t, policy) => {
    t.plan(2)

    t.assert(keysOr(policy.resources).some((key) => key.includes('>')))
    t.snapshot(policy)
  },
})

test('native-like module', testPolicyForJSON, 'phony-native.json')

test('native module', testPolicyForJSON, 'native.json')

test('native module w/ dynamic requires', testPolicyForJSON, 'dynamic.json')

test(
  'ignoring unused dependencies',
  testPolicyForJSON,
  'unused-dependency.json'
)

test(
  'policy override merging',
  testPolicyForJSON,
  'unused-dependency-override.json',
  {
    policyOverride: {
      resources: {
        blurmph: {
          builtin: {
            'node:path': true,
          },
        },
      },
    },
    expected: {
      resources: {
        blurmph: {
          builtin: {
            'node:fs': true,
            'node:path': true,
          },
        },
      },
    },
  }
)

test('basic nested global access', testPolicyForModule, 'location.href', {
  resources: {
    test: {
      globals: {
        'location.href': true,
      },
    },
  },
})

test(
  'CJS-specific ignores',
  testPolicyForScript,
  `
const js = [this]
const ignored = [global, require, module, exports, arguments]
const globalRefs = [typeof globalThis, typeof self, typeof window]
const xyz = nonIgnoredGlobal
`,
  {
    resources: {
      test: {
        globals: {
          nonIgnoredGlobal: true,
        },
      },
    },
  }
)

test(
  'ESM-specific ignores',
  testPolicyForModule,
  `
const js = [this]
const ignored = [global, require, module, exports, arguments]
const globalRefs = [typeof globalThis, typeof self, typeof window]
const xyz = nonIgnoredGlobal
export {xyz}
`,
  {
    resources: {
      test: {
        globals: {
          nonIgnoredGlobal: true,
          require: true,
          module: true,
          exports: true,
        },
      },
    },
  }
)

test(
  'ignored global refs',
  testPolicyForModule,
  `
  const href = window.location.href
  const xhr = new window.XMLHttpRequest()
  `,
  {
    resources: {
      test: {
        globals: {
          'location.href': true,
          XMLHttpRequest: true,
        },
      },
    },
  }
)

test(
  'ignored global refs when properties are not accessed',
  testPolicyForModule,
  'typeof window !== "undefined"',
  { resources: {} }
)

test(
  'ignored global refs accessed w/ whitelist items',
  testPolicyForModule,
  `window.Object === Object`,
  {
    resources: {},
  }
)

test('ignore newer intrinsics', testPolicyForModule, 'BigInt(123)', {
  resources: {},
})

test(
  'merge policy overrides with global writables',
  testPolicyForScript,
  `
globalThis.foo = 'bar'
console.log(globalThis.foo)
`,
  {
    policyOverride: {
      resources: {
        test: {
          globals: {
            // no such global, but it should persist
            bar: 'write',
          },
        },
      },
    },
    expected: {
      resources: {
        test: {
          globals: {
            foo: 'write',
            bar: 'write',
            'console.log': true,
          },
        },
      },
    },
  }
)

// This evasion wraps `pos--` in an array then takes the first element, as
// innovated by @gibson042
test(
  'the Gibson',
  testPolicyForScript,
  `
let pos = 10;
while (pos--` +
    ` > 0) {
  console.log(pos)
}
`,
  {
    resources: {
      test: {
        globals: {
          'console.log': true,
        },
      },
    },
  }
)

// This kind of crap was found in the TypeScript source
test(
  'dynamic import call in string',
  testPolicyForScript,
  `
console.log("you can use await import` +
    `('fs') to import ESM from CJS");
`,
  {
    resources: {
      test: {
        globals: {
          'console.log': true,
        },
      },
    },
  }
)
