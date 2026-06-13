import '../../../src/preamble.js'

import test from 'ava'
import { log, Loggerr } from '../../../src/log.js'
import { loadAndGeneratePolicy } from '../../../src/policy-gen/load-for-policy.js'
import { keysOr } from '../../../src/util.js'
import { JSON_FIXTURE_DIR_URL, loadJSONFixture } from '../json-fixture-util.js'
import { fixtureFinder } from '../../test-util.js'
import { createGeneratePolicyMacros } from './policy-macros.js'
import path from 'node:path'
import { MERGED_POLICY_FIELD } from '../../../src/constants.js'

const e2eFixture = fixtureFinder(new URL('../../e2e/', import.meta.url))

const { testPolicyForModule, testPolicyForScript, testPolicyForJSON } =
  createGeneratePolicyMacros(test)

// NOTE: All JSON fixtures are virtual filesystem snapshots and live in
// `../json-fixture/`

test('Node.js builtins', testPolicyForJSON, 'builtins.json')

test(
  'builtin and global redundancy elimination across modules in same package',
  testPolicyForJSON,
  'redundant-policy.json',
  {
    expected: {
      resources: {
        foo: {
          builtin: { 'node:fs': true },
          globals: { console: true },
        },
      },
    },
  }
)

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
          // is not required by anything at all, but is present in the fixture's
          // package.json. should not appear in the final policy for winken
          // since it cannot be detected.
          fugs: true,
        },
      },
      'winken>blinken': {
        builtin: {
          // this does not appear in the source, but this override forces it to
          // be in the resulting policy.
          'node:fs.read': true,
          // actually used in blinken
          'node:util.format': true,
        },
      },
    },
    include: ['winken>blinken'],
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
    include: ['winken>blinken'],
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
        policy.resources.winken?.packages?.['winken>blinken'] === true,
        'winken should have a policy for blinken'
      )
      t.snapshot(policy)
    },
  }
)

test('path stability', async (t) => {
  const maxIterations = 20
  if (process.env.LAVAMOAT_DEBUG === undefined) {
    log.setLevel(Loggerr.EMERGENCY)
  }
  t.plan(maxIterations)

  const { readPowers } = await loadJSONFixture(
    new URL('canonical-name.json', JSON_FIXTURE_DIR_URL),
    { randomDelay: true }
  )

  const expectedCanonicalName = 'paperino>topolino>goofy'
  const promises = []
  for (let i = 0; i < maxIterations; i++) {
    promises.push(
      loadAndGeneratePolicy('/node_modules/app/index.js', {
        readPowers,
      })
    )
  }
  const results = await Promise.allSettled(promises)
  for (const [iteration, result] of results.entries()) {
    if (result.status === 'fulfilled') {
      t.like(
        result.value.policy,
        {
          resources: {
            [expectedCanonicalName]: {
              globals: {
                'console.log': true,
              },
            },
          },
        },
        `should have correct policy for ${expectedCanonicalName} in iteration ${iteration}`
      )
    } else {
      t.fail(`${result.reason} (iteration ${iteration})`)
    }
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

// this is a test of the nullImportHook which is needed to avoid importing exit
// modules during policy generation
test(
  'exit module should not be imported',
  testPolicyForJSON,
  'exit-module-no-import.json',
  {
    modules: {
      'some-exit-module': {
        grief: () => {
          throw new Error('should not happen')
        },
      },
    },
  }
)

test('additionalLocations support', async (t) => {
  const { dir: projectRoot } = e2eFixture('webpackish')

  if (process.env.LAVAMOAT_DEBUG === undefined) {
    log.setLevel(Loggerr.EMERGENCY)
  }

  const { policy } = await loadAndGeneratePolicy(
    path.join(projectRoot, 'node_modules', 'pantspack', 'pantspack.js'),
    {
      trustRoot: false,
      log,
      projectRoot,
      policyOverride: {
        resources: {
          pantspack: {
            packages: {
              'webpackish-app': true,
              'jorts-folder': true,
            },
          },
        },
        include: ['webpackish-app'],
        additionalLocations: [
          { location: '.', modules: ['./pantspack.config.js'] },
        ],
      },
    }
  )
  delete (/** @type {any} */ (policy)[MERGED_POLICY_FIELD])
  t.snapshot(policy)
})

// Regression test: when trustRoot is false, the packageDependenciesHook must
// rewrite the root compartment's synthetic canonical name ('$root$') to the
// real package name before looking up the entry in policyOverride.resources.
// Previously, the hook used '$root$' directly and found nothing, so override-
// declared root dependencies were never seeded into the crawl.
test('untrusted root: override-declared root deps are seeded correctly', async (t) => {
  t.plan(3)

  const { entrypoint } = e2eFixture('webpackish')

  if (process.env.LAVAMOAT_DEBUG === undefined) {
    log.setLevel(Loggerr.EMERGENCY)
  }

  const { policy } = await loadAndGeneratePolicy(entrypoint, {
    trustRoot: false,
    log,
    policyOverride: {
      resources: {
        'webpackish-app': {
          packages: {
            'jorts-folder': true,
          },
        },
      },
    },
  })

  // root.usePolicy must be the entry package name, not '$root$'
  t.is(
    policy.root?.usePolicy,
    'webpackish-app',
    'root.usePolicy should be the entry package name'
  )
  // '$root$' must never leak as a resource key
  t.false(
    '$root$' in (policy.resources ?? {}),
    '$root$ must not appear as a resource key'
  )
  // Override-declared dependency must appear in the final policy
  t.true(
    policy.resources?.['webpackish-app']?.packages?.['jorts-folder'] === true,
    'jorts-folder should be in webpackish-app.packages (seeded from override)'
  )
})
