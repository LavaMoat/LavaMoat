// @ts-check

/**
 * @import {TestFn, ExecutionContext} from 'ava'
 * @import {LavaMoatPolicy, LavaMoatPolicyDebug} from '@lavamoat/types'
 */

const test = /** @type {TestFn} */ (/** @type {unknown} */ (require('ava')))
const { mergePolicy } = require('../src/mergePolicy.js')

/**
 * Macro that merges two policies via {@link mergePolicy} and asserts the result.
 */
const testMergePolicy = test.macro(
  /**
   * @template [Ctx=unknown] Custom execution context, if any. Default is
   *   `unknown`
   * @param {ExecutionContext<Ctx>} t
   * @param {LavaMoatPolicy} policy Base policy
   * @param {LavaMoatPolicy} policyOverride Policy override
   * @param {LavaMoatPolicy} expectedPolicy Expected policy
   */
  (t, policy, policyOverride, expectedPolicy) =>
    t.deepEqual(mergePolicy(policy, policyOverride), expectedPolicy)
)

// #region deduplication
test(
  'deduplication - basic merge',
  testMergePolicy,
  {
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
  },
  {
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
  },
  {
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
  }
)

test(
  'deduplication - re-add from override',
  testMergePolicy,
  {
    resources: {
      babel: {
        globals: {
          abc: true,
          xyz: false,
          'a.b': true,
          'q.w.e': true,
          document: true,
          window: true,
        },
        builtin: {
          derp: true,
          qwerty: false,
        },
      },
    },
  },
  {
    resources: {
      babel: {
        globals: {
          abc: false,
          'a.b.c': false,
          'q.w': false,
          document: false,
          'document.createElement': true,
          window: false,
          'window.location.hash': true,
        },
        builtin: {
          derp: false,
        },
      },
    },
  },
  {
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
          document: false,
          window: false,
          'document.createElement': true,
          'window.location.hash': true,
        },
      },
    },
  }
)
// #endregion

// #region general
test('general - allow override missing resources property', (t) => {
  t.plan(2)
  /** @type {LavaMoatPolicy} */
  const policy = {
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
  }
  const result = mergePolicy(
    policy,
    // @ts-expect-error - invalid policy
    {
      resolutions: {
        foo: {
          bar: './baz',
        },
      },
    }
  )
  t.deepEqual(
    result,
    {
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
      resolutions: {
        foo: {
          bar: './baz',
        },
      },
    },
    'result should contain contents of both objects'
  )
  t.not(result, policy, 'result should not be the same object as policy')
})

test('general - invalid nesting throws exception', (t) => {
  t.throws(
    () =>
      mergePolicy(
        {
          resources: {
            babel: {
              globals: {
                abc: true,
                qwe: true,
              },
            },
          },
        },
        {
          resources: {
            babel: {
              globals: {
                'abc.z': true,
                'qwe.z': true,
              },
            },
          },
        }
      ),
    {
      message: `LavaMoat - Policy hierarchy validation failed for resource "babel"
  "abc.z" is invalid when "abc" is also present in policy"
  "qwe.z" is invalid when "qwe" is also present in policy"
You could set the parent "abc" to false if you intended to override to a less permissive policy.`,
    }
  )
})

test(
  'general - no spontaneously-appearing fields (include, root, resolutions, debugInfo)',
  testMergePolicy,
  { resources: {} },
  { resources: {} },
  { resources: {} }
)
// #endregion

// #region ResourcePolicy
test(
  'resources - merges packages field',
  testMergePolicy,
  { resources: { pkg: { packages: { dep1: true, dep2: false } } } },
  { resources: { pkg: { packages: { dep2: true, dep3: true } } } },
  {
    resources: {
      pkg: { packages: { dep1: true, dep2: true, dep3: true } },
    },
  }
)

test(
  'resources - merges meta field',
  testMergePolicy,
  { resources: { pkg: { meta: { version: '1.0.0', tags: ['a'] } } } },
  { resources: { pkg: { meta: { version: '2.0.0', author: 'x' } } } },
  {
    resources: {
      pkg: { meta: { version: '2.0.0', tags: ['a'], author: 'x' } },
    },
  }
)

test(
  'resources - native from override overrides policy',
  testMergePolicy,
  { resources: { pkg: { native: true } } },
  { resources: { pkg: { native: false } } },
  { resources: { pkg: { native: false } } }
)

test(
  'resources - native preserved from policy when absent in override',
  testMergePolicy,
  { resources: { pkg: { native: true } } },
  { resources: { pkg: { globals: { x: true } } } },
  { resources: { pkg: { native: true, globals: { x: true } } } }
)

test(
  'resources - native from override when absent in policy',
  testMergePolicy,
  { resources: { pkg: { globals: { x: true } } } },
  { resources: { pkg: { native: true } } },
  { resources: { pkg: { native: true, globals: { x: true } } } }
)

test(
  'resources - only override has globals for a package',
  testMergePolicy,
  { resources: { pkg: { builtin: { fs: true } } } },
  { resources: { pkg: { globals: { console: true } } } },
  {
    resources: {
      pkg: { globals: { console: true }, builtin: { fs: true } },
    },
  }
)

test(
  'resources - resource only in override',
  testMergePolicy,
  { resources: { 'pkg-a': { globals: { x: true } } } },
  { resources: { 'pkg-b': { globals: { y: true } } } },
  {
    resources: {
      'pkg-a': { globals: { x: true } },
      'pkg-b': { globals: { y: true } },
    },
  }
)
// #endregion

// #region RootPolicy
test(
  'root - override overrides policy',
  testMergePolicy,
  { resources: {}, root: { usePolicy: 'pkg-a' } },
  { resources: {}, root: { usePolicy: 'pkg-b' } },
  { resources: {}, root: { usePolicy: 'pkg-b' } }
)

test(
  'root - only policy has root',
  testMergePolicy,
  { resources: {}, root: { usePolicy: 'pkg-a' } },
  { resources: {} },
  { resources: {}, root: { usePolicy: 'pkg-a' } }
)

test(
  'root - only override has root',
  testMergePolicy,
  { resources: {} },
  { resources: {}, root: { usePolicy: 'pkg-b' } },
  { resources: {}, root: { usePolicy: 'pkg-b' } }
)

// #endregion

// #region IncludePolicy
test(
  'include - deduplicates string items',
  testMergePolicy,
  { resources: {}, include: ['a>b', 'c'] },
  { resources: {}, include: ['a>b', 'd'] },
  { resources: {}, include: ['a>b', 'c', 'd'] }
)

test(
  'include - deduplicates object items',
  testMergePolicy,
  { resources: {}, include: [{ name: 'a>b', entry: './index.js' }] },
  { resources: {}, include: [{ name: 'a>b', entry: './index.js' }] },
  { resources: {}, include: [{ name: 'a>b', entry: './index.js' }] }
)

test(
  'include - mixed string and object items',
  testMergePolicy,
  { resources: {}, include: ['a>b'] },
  { resources: {}, include: [{ name: 'a>b', entry: './other.js' }] },
  { resources: {}, include: ['a>b', { name: 'a>b', entry: './other.js' }] }
)

test(
  'include - no overlap',
  testMergePolicy,
  { resources: {}, include: ['a'] },
  { resources: {}, include: ['b'] },
  { resources: {}, include: ['a', 'b'] }
)

test(
  'include - only policy has include',
  testMergePolicy,
  { resources: {}, include: ['a'] },
  { resources: {} },
  { resources: {}, include: ['a'] }
)

test(
  'include - only override has include',
  testMergePolicy,
  { resources: {} },
  { resources: {}, include: ['b'] },
  { resources: {}, include: ['b'] }
)

test(
  'include - same name, different entries are distinct',
  testMergePolicy,
  { resources: {}, include: [{ name: 'pkg', entry: './a.js' }] },
  { resources: {}, include: [{ name: 'pkg', entry: './b.js' }] },
  {
    resources: {},
    include: [
      { name: 'pkg', entry: './a.js' },
      { name: 'pkg', entry: './b.js' },
    ],
  }
)
// #endregion

// #region Resolutions
test(
  'resolutions - merges per-package maps with override overriding',
  testMergePolicy,
  { resources: {}, resolutions: { pkg: { './old': './replaced-a' } } },
  {
    resources: {},
    resolutions: { pkg: { './old': './replaced-b', './new': './target' } },
  },
  {
    resources: {},
    resolutions: { pkg: { './old': './replaced-b', './new': './target' } },
  }
)

test(
  'resolutions - merges distinct package names',
  testMergePolicy,
  { resources: {}, resolutions: { 'pkg-a': { './x': './y' } } },
  { resources: {}, resolutions: { 'pkg-b': { './a': './b' } } },
  {
    resources: {},
    resolutions: {
      'pkg-a': { './x': './y' },
      'pkg-b': { './a': './b' },
    },
  }
)

test(
  'resolutions - only policy has resolutions',
  testMergePolicy,
  { resources: {}, resolutions: { pkg: { './a': './b' } } },
  { resources: {} },
  { resources: {}, resolutions: { pkg: { './a': './b' } } }
)

test(
  'resolutions - only override has resolutions',
  testMergePolicy,
  { resources: {} },
  { resources: {}, resolutions: { pkg: { './a': './b' } } },
  { resources: {}, resolutions: { pkg: { './a': './b' } } }
)

// #endregion

// #region No-mutation guarantee
test('mutation - returns original policy when no override provided', (t) => {
  /** @type {LavaMoatPolicy} */
  const policy = { resources: { pkg: { globals: { x: true } } } }
  const result = mergePolicy(policy)
  t.is(result, policy)
})

test('mutation - merged policy contains no references to original objects', (t) => {
  /** @type {LavaMoatPolicy} */
  const policy = {
    resources: {
      pkg: {
        globals: { console: true },
        builtin: { 'node:fs': true },
        packages: { dep: true },
        native: true,
        // @ts-expect-error - env is undocumented
        env: 'unfrozen',
        meta: { version: '1.0.0' },
      },
    },
    resolutions: { pkg: { './a': './b' } },
    root: { usePolicy: 'pkg' },
    include: [{ name: 'pkg', entry: './index.js' }],
  }

  /** @type {LavaMoatPolicy} */
  const policyOverride = {
    resources: {
      pkg: {
        globals: { fetch: true },
        builtin: { 'node:path': true },
        packages: { other: true },
        native: false,
        // @ts-expect-error - env is undocumented
        env: 'frozen',
        meta: { author: 'x' },
      },
    },
    resolutions: { pkg: { './c': './d' } },
    root: { usePolicy: 'pkg' },
    include: ['extra'],
  }

  const result = mergePolicy(policy, policyOverride)

  /**
   * Collect every object reachable from `root` into a `Set`.
   *
   * @param {unknown} root
   * @returns {Set<object>}
   */
  const collectObjects = (root) => {
    /** @type {Set<object>} */
    const seen = new Set()
    /** @param {unknown} val */
    const walk = (val) => {
      if (val !== null && typeof val === 'object' && !seen.has(val)) {
        seen.add(val)
        for (const v of Object.values(val)) {
          walk(v)
        }
      }
    }
    walk(root)
    return seen
  }

  const policyObjects = collectObjects(policy)
  const overrideObjects = collectObjects(policyOverride)
  const resultObjects = collectObjects(result)

  for (const obj of resultObjects) {
    for (const orig of policyObjects) {
      t.not(obj, orig, 'merged policy must not share objects with policy')
    }
    for (const orig of overrideObjects) {
      t.not(
        obj,
        orig,
        'merged policy must not share objects with policyOverride'
      )
    }
  }
})

test('mutation - does not mutate policy when resource has dedup-able globals', (t) => {
  /** @type {LavaMoatPolicy} */
  const policy = {
    resources: {
      onlyInPolicy: {
        globals: {
          'a.b.c': true,
          'a.b': true,
          x: true,
        },
        builtin: {
          'node:fs.readFile': true,
          'node:fs': true,
        },
      },
    },
  }

  const { globals: globalsBefore, builtin: builtinBefore } =
    policy.resources.onlyInPolicy

  mergePolicy(policy, {
    resources: {
      somethingElse: {
        globals: { y: true },
      },
    },
  })

  t.is(
    policy.resources.onlyInPolicy.globals,
    globalsBefore,
    'policy globals reference must not be replaced'
  )
  t.is(
    policy.resources.onlyInPolicy.builtin,
    builtinBefore,
    'policy builtin reference must not be replaced'
  )
})
// #endregion

// #region DebugInfo
test(
  'debugInfo - preserves debugInfo from policy',
  testMergePolicy,
  { resources: {}, debugInfo: { pkg: { globals: { x: true } } } },
  { resources: {} },
  { resources: {}, debugInfo: { pkg: { globals: { x: true } } } }
)

test(
  'debugInfo - ignores debugInfo in overrides',
  testMergePolicy,
  { resources: {}, debugInfo: { pkg: { globals: { x: true } } } },
  { resources: {}, debugInfo: { pkg: { globals: { y: true } } } },
  { resources: {}, debugInfo: { pkg: { globals: { x: true } } } }
)

// #region use
test(
  'use - disjoint arrays are unioned',
  testMergePolicy,
  { resources: {}, use: ['a', 'b'] },
  { resources: {}, use: ['c', 'd'] },
  { resources: {}, use: ['a', 'b', 'c', 'd'] }
)

test(
  'use - overlapping entries are deduplicated',
  testMergePolicy,
  { resources: {}, use: ['a', 'b'] },
  { resources: {}, use: ['b', 'c'] },
  { resources: {}, use: ['a', 'b', 'c'] }
)

test(
  'use - only policy has use',
  testMergePolicy,
  { resources: {}, use: ['a'] },
  { resources: {} },
  { resources: {}, use: ['a'] }
)

test(
  'use - only override has use',
  testMergePolicy,
  { resources: {} },
  { resources: {}, use: ['a'] },
  { resources: {}, use: ['a'] }
)

test(
  'use - neither has use, field is absent',
  testMergePolicy,
  { resources: {} },
  { resources: {} },
  { resources: {} }
)
// #endregion

// #region capabilities
test(
  'capabilities - override capabilities replace base',
  testMergePolicy,
  { resources: { pkg: { capabilities: { cap: ['optA'] } } } },
  { resources: { pkg: { capabilities: { cap: ['optB'] } } } },
  { resources: { pkg: { capabilities: { cap: ['optB'] } } } }
)

test(
  'capabilities - override adds capabilities to resource without them',
  testMergePolicy,
  { resources: { pkg: {} } },
  { resources: { pkg: { capabilities: { cap: [] } } } },
  { resources: { pkg: { capabilities: { cap: [] } } } }
)

test(
  'capabilities - resource without override keeps its capabilities',
  testMergePolicy,
  { resources: { pkg: { capabilities: { cap: ['optA'] } } } },
  { resources: {} },
  { resources: { pkg: { capabilities: { cap: ['optA'] } } } }
)

test(
  'capabilities - override with empty object clears capabilities',
  testMergePolicy,
  { resources: { pkg: { capabilities: { cap: ['optA'] } } } },
  { resources: { pkg: { capabilities: {} } } },
  { resources: { pkg: { capabilities: {} } } }
)

test(
  'capabilities - override wins entirely when names overlap with different options',
  testMergePolicy,
  { resources: { pkg: { capabilities: { capA: ['opt1'], capB: ['opt2'] } } } },
  { resources: { pkg: { capabilities: { capA: ['opt3'], capC: ['opt4'] } } } },
  { resources: { pkg: { capabilities: { capA: ['opt3'], capC: ['opt4'] } } } }
)
// #endregion

// #endregion

// #region env
// @ts-expect-error - env is undocumented
test(
  'env - preserves env from policy when absent in override',
  testMergePolicy,
  { resources: { pkg: { env: 'unfrozen' } } },
  { resources: { pkg: { packages: { dep1: true, dep2: false } } } },
  {
    resources: {
      pkg: { env: 'unfrozen', packages: { dep1: true, dep2: false } },
    },
  }
)
// @ts-expect-error - env is undocumented
test(
  'env - preserves env from override when absent in policy',
  testMergePolicy,
  { resources: {} },
  { resources: { pkg: { env: 'unfrozen' } } },
  { resources: { pkg: { env: 'unfrozen' } } }
)

// @ts-expect-error - env is undocumented
test(
  'env - env from override overrides env from policy',
  testMergePolicy,
  { resources: { pkg: { env: 'meatballs' } } },
  { resources: { pkg: { env: 'unfrozen' } } },
  { resources: { pkg: { env: 'unfrozen' } } }
)
// #endregion
