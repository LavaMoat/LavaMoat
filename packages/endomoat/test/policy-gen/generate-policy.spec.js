import 'ses'

import test from 'ava'
import { createGeneratePolicyMacros } from './macros.js'

const { testPolicyForModule, testPolicyForScript, testPolicyForJSON } =
  createGeneratePolicyMacros(test)

test(testPolicyForJSON, 'builtins.json')

test(testPolicyForJSON, 'kitchen-sink.json')

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

test(
  'generatePolicy - ignore newer intrinsics',
  testPolicyForModule,
  'BigInt(123)',
  { resources: {} }
)
