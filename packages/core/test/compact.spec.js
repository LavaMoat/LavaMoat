// @ts-check

const test = /** @type {TestFn} */ (/** @type {unknown} */ (require('ava')))
const { compactPolicyOverride } = require('../src/compact')

/**
 * @import {LavaMoatPolicy} from "@lavamoat/types"
 * @import {TestFn} from "ava"
 */

test('compactPolicyOverride - removes redundant globals key', (t) => {
  const policy = { resources: { foo: { globals: { console: true } } } }
  const override = { resources: { foo: { globals: { console: true } } } }
  const result = compactPolicyOverride(override, policy)
  t.deepEqual(result.policy, { resources: {} })
  t.true(result.compacted)
})

test('compactPolicyOverride - removes redundant builtin key', (t) => {
  const policy = { resources: { foo: { builtin: { fs: true } } } }
  const override = { resources: { foo: { builtin: { fs: true } } } }
  const result = compactPolicyOverride(override, policy)
  t.deepEqual(result.policy, { resources: {} })
  t.true(result.compacted)
})

test('compactPolicyOverride - removes redundant packages key', (t) => {
  const policy = { resources: { foo: { packages: { bar: true } } } }
  const override = { resources: { foo: { packages: { bar: true } } } }
  const result = compactPolicyOverride(override, policy)
  t.deepEqual(result.policy, { resources: {} })
  t.true(result.compacted)
})

test('compactPolicyOverride - keeps key with different value', (t) => {
  const policy = { resources: { foo: { globals: { console: true } } } }
  /** @type {LavaMoatPolicy} */
  const override = { resources: { foo: { globals: { console: 'write' } } } }
  const result = compactPolicyOverride(override, policy)
  t.deepEqual(result.policy, {
    resources: { foo: { globals: { console: 'write' } } },
  })
  t.false(result.compacted)
})

test('compactPolicyOverride - keeps false override when policy lacks the key', (t) => {
  const policy = { resources: { foo: { globals: {} } } }
  const override = { resources: { foo: { globals: { process: false } } } }
  const result = compactPolicyOverride(override, policy)
  t.deepEqual(result.policy, {
    resources: { foo: { globals: { process: false } } },
  })
  t.false(result.compacted)
})

test('compactPolicyOverride - keeps key missing from generated policy', (t) => {
  const policy = { resources: {} }
  const override = { resources: { foo: { globals: { process: true } } } }
  const result = compactPolicyOverride(override, policy)
  t.deepEqual(result.policy, {
    resources: { foo: { globals: { process: true } } },
  })
  t.false(result.compacted)
})

test('compactPolicyOverride - prunes empty sub-fields and resource entries', (t) => {
  const policy = {
    resources: {
      foo: { globals: { process: true }, builtin: { fs: true } },
    },
  }
  const override = {
    resources: {
      foo: {
        globals: { process: true },
        builtin: { fs: true },
        packages: { bar: true },
      },
    },
  }
  const result = compactPolicyOverride(override, policy)
  // globals + builtin fully redundant, only packages remains
  t.deepEqual(result.policy, {
    resources: { foo: { packages: { bar: true } } },
  })
  t.true(result.compacted)
})

test('compactPolicyOverride - resources is always present even when fully compacted', (t) => {
  const policy = { resources: { foo: { globals: { x: true } } } }
  const override = { resources: { foo: { globals: { x: true } } } }
  const result = compactPolicyOverride(override, policy)
  t.true('resources' in result.policy)
  t.deepEqual(result.policy.resources, {})
  t.true(result.compacted)
})

test('compactPolicyOverride - passes native flag through', (t) => {
  const policy = { resources: { foo: {} } }
  const override = { resources: { foo: { native: true } } }
  const result = compactPolicyOverride(override, policy)
  t.deepEqual(result.policy, { resources: { foo: { native: true } } })
  t.false(result.compacted)
})

test('compactPolicyOverride - passes meta through', (t) => {
  const policy = { resources: { foo: {} } }
  const override = { resources: { foo: { meta: { tags: ['a', 'b'] } } } }
  const result = compactPolicyOverride(override, policy)
  t.deepEqual(result.policy, {
    resources: { foo: { meta: { tags: ['a', 'b'] } } },
  })
  t.false(result.compacted)
})

test('compactPolicyOverride - passes include through unchanged', (t) => {
  const policy = { resources: {}, include: ['foo'] }
  const override = {
    resources: {},
    include: /** @type {any} */ (['foo', 'bar']),
  }
  const result = compactPolicyOverride(override, policy)
  t.deepEqual(result.policy.include, ['foo', 'bar'])
  t.false(result.compacted)
})

test('compactPolicyOverride - passes root through unchanged', (t) => {
  const policy = { resources: {}, root: { usePolicy: 'foo' } }
  const override = {
    resources: {},
    root: /** @type {any} */ ({ usePolicy: 'bar' }),
  }
  const result = compactPolicyOverride(override, policy)
  t.deepEqual(result.policy.root, { usePolicy: 'bar' })
  t.false(result.compacted)
})

test('compactPolicyOverride - passes resolutions through unchanged', (t) => {
  const policy = { resources: {} }
  const override = {
    resources: {},
    resolutions: /** @type {any} */ ({ foo: { './a': './b' } }),
  }
  const result = compactPolicyOverride(override, policy)
  t.deepEqual(result.policy.resolutions, { foo: { './a': './b' } })
  t.false(result.compacted)
})

test('compactPolicyOverride - does not mutate inputs', (t) => {
  const policy = { resources: { foo: { globals: { process: true } } } }
  const override = { resources: { foo: { globals: { process: true } } } }
  const overrideCopy = JSON.parse(JSON.stringify(override))
  const policyCopy = JSON.parse(JSON.stringify(policy))
  compactPolicyOverride(override, policy)
  t.deepEqual(override, overrideCopy)
  t.deepEqual(policy, policyCopy)
})

test('compactPolicyOverride - returns equivalent object when nothing is redundant', (t) => {
  const policy = { resources: {} }
  const override = {
    resources: { foo: { globals: { process: true }, packages: { bar: true } } },
  }
  const result = compactPolicyOverride(override, policy)
  t.deepEqual(result.policy, override)
  t.not(result.policy, override)
  t.false(result.compacted)
})

test('compactPolicyOverride - removes packages that are statically discovered AND listed in override (case "both")', (t) => {
  // When seededPackagesByCanonicalName tracking is correct, the un-merged base
  // contains entries that are TRUE static deps even if they also happen to be
  // in the override. compactPolicyOverride should detect those as redundant.
  const pureBase = {
    resources: {
      foo: { packages: { 'foo>statically-discovered-dep': true } },
    },
  }
  const override = {
    resources: {
      foo: {
        // statically discovered → should be stripped from override
        packages: { 'foo>statically-discovered-dep': true },
      },
    },
  }
  const result = compactPolicyOverride(override, pureBase)
  t.deepEqual(result.policy, { resources: {} })
  t.true(result.compacted)
})

test('compactPolicyOverride - kitchen sink: strips redundant builtin/globals; keeps override-only packages', (t) => {
  // Mirrors the shape of __e2e-dogfooding__ policy-override entries.
  //
  // The "policy" here is what buildPureBaseForCompaction produces: the
  // un-merged base policy with override-seeded package connections already
  // stripped. That means flat-named packages like '@babel/preset-env' that
  // appear in @babel/core's packages ONLY because the packageDependenciesHook
  // seeded them from the override are NOT present in this base.
  //
  // Only entries discovered by static analysis (e.g. builtin/globals, or
  // packages with the parent>child canonical-name pattern) remain.
  const pureBase = {
    resources: {
      // @babel/preset-env and similar flat-named packages are NOT here because
      // they were seeded by the packageDependenciesHook, not found statically.
      '@babel/core': {
        builtin: { fs: true, path: true },
        globals: { 'console.log': true },
      },
      // '@babel/preset-env>semver' has the parent>child form → statically found
      '@babel/preset-env': {
        packages: { '@babel/preset-env>semver': true },
      },
      // html-webpack-plugin's builtin was found by static analysis
      'html-webpack-plugin': {
        builtin: { url: true },
      },
    },
  }
  const override = {
    resources: {
      // builtin + globals fully covered by static base → removed
      // packages NOT in pure base (seeded by hook) → kept
      '@babel/core': {
        builtin: { fs: true, path: true },
        globals: { 'console.log': true },
        packages: {
          '@babel/preset-env': true,
          '@babel/preset-react': true,
          '@babel/preset-typescript': true,
        },
      },
      // '@babel/preset-env>semver' is covered by static base → removed
      '@babel/preset-env': {
        packages: { '@babel/preset-env>semver': true },
      },
      // html-webpack-plugin builtin covered → removed
      'html-webpack-plugin': {
        builtin: { url: true },
      },
      // NOT in base at all → kept
      'webpack>loader-runner': {
        packages: { 'babel-loader': true },
      },
    },
  }
  const result = compactPolicyOverride(override, pureBase)
  t.deepEqual(result.policy, {
    resources: {
      // only the packages remain (builtin+globals were stripped)
      '@babel/core': {
        packages: {
          '@babel/preset-env': true,
          '@babel/preset-react': true,
          '@babel/preset-typescript': true,
        },
      },
      // fully stripped → entry removed
      // '@babel/preset-env' entry gone
      // 'html-webpack-plugin' entry gone
      'webpack>loader-runner': {
        packages: { 'babel-loader': true },
      },
    },
  })
  t.true(result.compacted)
})
