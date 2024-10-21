import 'ses'

import test from 'ava'
import {
  assertPolicyOverride,
  generatePolicy,
  readPolicyOverride,
} from '../../src/index.js'
import { createGeneratePolicyMacros } from './macros.js'

const { testPolicyForModule, testPolicyForScript, testPolicyForJSON } =
  createGeneratePolicyMacros(test)

test(testPolicyForJSON, 'builtins.json')

test(testPolicyForJSON, 'kitchen-sink.json')

test(testPolicyForJSON, 'phony-native.json')

// NOTE: this will not generate a "dynamic" prop because `require` is set to a
// different identifier (`runtimeRequire`) in node-gyp-build
test(testPolicyForJSON, 'native.json')

test(testPolicyForJSON, 'dynamic.json')

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

test('generatePolicy - handling unused dependencies', async (t) => {
  const entryFile = new URL(
    '../fixture/unused-dependency/app.js',
    import.meta.url
  )

  const policy = await generatePolicy(entryFile)

  t.deepEqual(policy, { resources: {} })
})

test('generatePolicy - use policy overrides', async (t) => {
  const entryFile = new URL(
    '../fixture/unused-dependency-override/app.js',
    import.meta.url
  )

  const policyOverride = await readPolicyOverride(
    new URL(
      '../fixture/unused-dependency-override/lavamoat/node/policy-override.json',
      import.meta.url
    )
  )
  assertPolicyOverride(policyOverride)
  const policy = await generatePolicy(entryFile, { policyOverride })

  t.deepEqual(policy, {
    resources: {
      blurmph: {
        builtin: {
          'node:fs': true,
          'node:path': true,
        },
      },
    },
  })
})