import '../../../src/preamble.js'

import test from 'ava'

import { generatePolicy } from '../../../src/policy-gen/generate.js'
import { keysOr } from '../../../src/util.js'
import { JSON_FIXTURE_DIR_URL, loadJSONFixture } from '../json-fixture-util.js'
import { createGeneratePolicyMacros } from './policy-macros.js'

const { testPolicyForJSON, testPolicyForModule, testPolicyForScript } =
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

test('native module', testPolicyForJSON, 'native.json')

test('native module w/ dynamic requires', testPolicyForJSON, 'dynamic.json')

test(
  'ignoring unused dependencies',
  testPolicyForJSON,
  'unused-dependency.json'
)

test('policy override merging', testPolicyForJSON, 'override-merging.json', {
  expected: {
    resources: {
      blurgh: {
        globals: {
          console: true,
        },
      },
      blurmph: {
        builtin: {
          'node:fs': true,
          'node:path': true,
        },
      },
    },
  },
  policyOverride: {
    resources: {
      blurgh: {
        globals: {
          console: true,
        },
      },
      blurmph: {
        builtin: {
          'node:path': true,
        },
      },
    },
  },
})

test('override expansion', testPolicyForJSON, 'override-expansion.json', {
  expected: {
    resources: {
      winken: {
        builtin: {
          'node:util.format': true,
        },
        packages: {
          fugs: true,
          'winken>blinken': true,
          'winken>fred': true,
        },
      },
      'winken>blinken': {
        builtin: {
          'node:fs.read': true,
          'node:util.format': true,
        },
      },
      'winken>fred': {
        builtin: {
          'node:util.format': true,
        },
      },
    },
  },
  policyOverride: {
    resources: {
      winken: {
        packages: {
          // is not required by anything at all, but is present in the fixture's package.json. should not appear in the final policy for winken since it cannot be detected.
          fugs: true,
          // is dynamically required by winken
          'winken>blinken': true,
        },
      },
      'winken>blinken': {
        builtin: {
          // this does not appear in the source, but this override
          // forces it to be in the resulting policy.
          'node:fs.read': true,
        },
      },
    },
  },
})

test('hashbang evasion', testPolicyForJSON, 'hashbang.json')

test(
  'package imported via relative path',
  testPolicyForJSON,
  'relative-package.json',
  {
    expected: (t, policy) => {
      t.plan(2)
      t.true(
        policy.resources.winken?.packages?.['winken>blinken'] === undefined,
        'winken should have no policy for blinken'
      )
      t.snapshot(policy)
    },
  }
)

test.failing('path stability', async (t) => {
  // no plan; this should fail on the first assertion failure

  const maxIterations = 20
  const { readPowers } = await loadJSONFixture(
    new URL('canonical-name.json', JSON_FIXTURE_DIR_URL),
    { randomDelay: true }
  )
  const expectedCanonicalName = 'paperino>topoino>goofy'
  for (let i = 0; i < maxIterations; i++) {
    const policy = await generatePolicy('/node_modules/app/index.js', {
      readPowers,
    })

    // this will fail if we get the wrong canonical name for goofy
    t.like(
      policy,
      {
        resources: {
          [expectedCanonicalName]: {
            globals: {
              'console.log': true,
            },
          },
        },
      },
      `failed on iteration ${i}`
    )
  }
})

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
          exports: true,
          module: true,
          nonIgnoredGlobal: true,
          require: true,
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
  'window.Object === Object',
  { resources: {} }
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
    expected: {
      resources: {
        test: {
          globals: {
            bar: 'write',
            'console.log': true,
            foo: 'write',
          },
        },
      },
    },
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

test.todo('exit modules are not imported')
