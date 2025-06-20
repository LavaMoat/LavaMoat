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

test('native module', testPolicyForJSON, 'native.json')

test('native module w/ dynamic requires', testPolicyForJSON, 'dynamic.json')

test(
  'ignoring unused dependencies',
  testPolicyForJSON,
  'unused-dependency.json'
)

test('policy override merging', testPolicyForJSON, 'override-merging.json', {
  policyOverride: {
    resources: {
      blurmph: {
        builtin: {
          'node:path': true,
        },
      },
      blurgh: {
        globals: {
          console: true,
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
      blurgh: {
        globals: {
          console: true,
        },
      },
    },
  },
})

test('override expansion', testPolicyForJSON, 'override-expansion.json', {
  policyOverride: {
    resources: {
      winken: {
        packages: {
          // is dynamically required by winken
          'winken>blinken': true,
          // is not required by anything at all, but is present in the fixture's package.json. should not appear in the final policy for winken since it cannot be detected.
          fugs: true,
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
  expected: {
    resources: {
      'winken>blinken': {
        builtin: {
          'node:util.format': true,
          'node:fs.read': true,
        },
      },
      'winken>fred': {
        builtin: {
          'node:util.format': true,
        },
      },
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

test('hints', testPolicyForJSON, 'hints.json', {
  jsonEntrypoint: '/node_modules/tool/index.js',
  policyOverride: {
    resources: {},
    hints: {
      winken: ['blinken'],
    },
  },
  expected: {
    hints: {
      winken: ['blinken'],
    },
    resources: {
      winken: {
        builtin: {
          'node:util.format': true,
        },
        packages: {
          'winken>fred': true,
          'winken>blinken': true,
        },
      },
      'winken>blinken': {
        builtin: {
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
})

test(
  'hints - no support for builtins',
  testPolicyForJSON,
  'hints-builtin.json',
  {
    jsonEntrypoint: '/node_modules/tool/index.js',
    policyOverride: {
      resources: {},
      hints: {
        winken: ['node:net'],
      },
    },
    expected: {
      hints: {
        winken: ['node:net'],
      },
      resources: {
        winken: {
          builtin: {
            'node:util.format': true,
          },
          packages: {
            'winken>fred': true,
          },
        },
        'winken>fred': {
          builtin: {
            'node:util.format': true,
          },
        },
      },
    },
  }
)

test('hints - external resources', testPolicyForJSON, 'hints-ext.json', {
  jsonEntrypoint: '/node_modules/tool/index.js',
  trustRoot: false,
  dev: true,
  policyOverride: {
    resources: {},
    hints: {
      './node_modules/tool/index.js': ['/tool.config.js'],
    },
  },
  expected: {
    resources: {
      fugs: {
        builtin: {
          'node:util.format': true,
        },
      },
      'hints-ext': {
        packages: {
          fugs: true,
        },
      },
      tool: {
        packages: {
          'hints-ext': true,
        },
      },
    },
    root: {
      usePolicy: 'tool',
    },
    hints: {
      './node_modules/tool/index.js': ['/tool.config.js'],
    },
  },
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

test.todo('exit modules are not imported')
