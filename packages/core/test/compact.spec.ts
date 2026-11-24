import test from 'ava'
import { compactPolicyOverride } from '../src/compact.ts'
import type { LavaMoatPolicy } from '@lavamoat/types'

test('compactPolicyOverride - removes redundant globals key', (t) => {
  const policy: LavaMoatPolicy = { resources: { foo: { globals: { console: true } } } }
  const override: LavaMoatPolicy = { resources: { foo: { globals: { console: true } } } }
  const result = compactPolicyOverride(override, policy)
  t.deepEqual(result.policy, { resources: {} })
  t.true(result.compacted)
})

test('compactPolicyOverride - removes redundant builtin key', (t) => {
  const policy: LavaMoatPolicy = { resources: { foo: { builtin: { fs: true } } } }
  const override: LavaMoatPolicy = { resources: { foo: { builtin: { fs: true } } } }
  const result = compactPolicyOverride(override, policy)
  t.deepEqual(result.policy, { resources: {} })
  t.true(result.compacted)
})

test('compactPolicyOverride - removes redundant packages key', (t) => {
  const policy: LavaMoatPolicy = { resources: { foo: { packages: { bar: true } } } }
  const override: LavaMoatPolicy = { resources: { foo: { packages: { bar: true } } } }
  const result = compactPolicyOverride(override, policy)
  t.deepEqual(result.policy, { resources: {} })
  t.true(result.compacted)
})

test('compactPolicyOverride - keeps key with different value', (t) => {
  const policy: LavaMoatPolicy = { resources: { foo: { globals: { console: true } } } }
  const override: LavaMoatPolicy = {
    resources: { foo: { globals: { console: 'write' } } },
  }
  const result = compactPolicyOverride(override, policy)
  t.deepEqual(result.policy, {
    resources: { foo: { globals: { console: 'write' } } },
  })
  t.false(result.compacted)
})

test('compactPolicyOverride - keeps false override when policy lacks the key', (t) => {
  const policy: LavaMoatPolicy = { resources: { foo: { globals: {} } } }
  const override: LavaMoatPolicy = {
    resources: { foo: { globals: { process: false } } },
  }
  const result = compactPolicyOverride(override, policy)
  t.deepEqual(result.policy, {
    resources: { foo: { globals: { process: false } } },
  })
  t.false(result.compacted)
})

test('compactPolicyOverride - keeps key missing from generated policy', (t) => {
  const policy: LavaMoatPolicy = { resources: {} }
  const override: LavaMoatPolicy = {
    resources: { foo: { globals: { process: true } } },
  }
  const result = compactPolicyOverride(override, policy)
  t.deepEqual(result.policy, {
    resources: { foo: { globals: { process: true } } },
  })
  t.false(result.compacted)
})

test('compactPolicyOverride - prunes empty sub-fields and resource entries', (t) => {
  const policy: LavaMoatPolicy = {
    resources: {
      foo: { globals: { process: true }, builtin: { fs: true } },
    },
  }
  const override: LavaMoatPolicy = {
    resources: {
      foo: {
        globals: { process: true },
        builtin: { fs: true },
        packages: { bar: true },
      },
    },
  }
  const result = compactPolicyOverride(override, policy)
  t.deepEqual(result.policy, {
    resources: { foo: { packages: { bar: true } } },
  })
  t.true(result.compacted)
})

test('compactPolicyOverride - resources is always present even when fully compacted', (t) => {
  const policy: LavaMoatPolicy = { resources: { foo: { globals: { x: true } } } }
  const override: LavaMoatPolicy = { resources: { foo: { globals: { x: true } } } }
  const result = compactPolicyOverride(override, policy)
  t.true('resources' in result.policy)
  t.deepEqual(result.policy.resources, {})
  t.true(result.compacted)
})

test('compactPolicyOverride - passes native flag through', (t) => {
  const policy: LavaMoatPolicy = { resources: { foo: {} } }
  const override: LavaMoatPolicy = { resources: { foo: { native: true } } }
  const result = compactPolicyOverride(override, policy)
  t.deepEqual(result.policy, { resources: { foo: { native: true } } })
  t.false(result.compacted)
})

test('compactPolicyOverride - passes meta through', (t) => {
  const policy: LavaMoatPolicy = { resources: { foo: {} } }
  const override: LavaMoatPolicy = {
    resources: { foo: { meta: { tags: ['a', 'b'] } } },
  }
  const result = compactPolicyOverride(override, policy)
  t.deepEqual(result.policy, {
    resources: { foo: { meta: { tags: ['a', 'b'] } } },
  })
  t.false(result.compacted)
})

test('compactPolicyOverride - passes include through unchanged', (t) => {
  const policy: LavaMoatPolicy = { resources: {}, include: ['foo'] }
  const override = {
    resources: {},
    include: ['foo', 'bar'],
  } as LavaMoatPolicy
  const result = compactPolicyOverride(override, policy)
  t.deepEqual(result.policy.include, ['foo', 'bar'])
  t.false(result.compacted)
})

test('compactPolicyOverride - passes root through unchanged', (t) => {
  const policy: LavaMoatPolicy = { resources: {}, root: { usePolicy: 'foo' } }
  const override = {
    resources: {},
    root: { usePolicy: 'bar' },
  } as LavaMoatPolicy
  const result = compactPolicyOverride(override, policy)
  t.deepEqual(result.policy.root, { usePolicy: 'bar' })
  t.false(result.compacted)
})

test('compactPolicyOverride - does not mutate inputs', (t) => {
  const policy: LavaMoatPolicy = {
    resources: { foo: { globals: { process: true } } },
  }
  const override: LavaMoatPolicy = {
    resources: { foo: { globals: { process: true } } },
  }
  const overrideCopy = JSON.parse(JSON.stringify(override)) as LavaMoatPolicy
  const policyCopy = JSON.parse(JSON.stringify(policy)) as LavaMoatPolicy
  compactPolicyOverride(override, policy)
  t.deepEqual(override, overrideCopy)
  t.deepEqual(policy, policyCopy)
})

test('compactPolicyOverride - returns equivalent object when nothing is redundant', (t) => {
  const policy: LavaMoatPolicy = { resources: {} }
  const override: LavaMoatPolicy = {
    resources: { foo: { globals: { process: true }, packages: { bar: true } } },
  }
  const result = compactPolicyOverride(override, policy)
  t.deepEqual(result.policy, override)
  t.not(result.policy, override)
  t.false(result.compacted)
})

test('compactPolicyOverride - removes packages that are statically discovered AND listed in override', (t) => {
  const pureBase: LavaMoatPolicy = {
    resources: {
      foo: { packages: { 'foo>statically-discovered-dep': true } },
    },
  }
  const override: LavaMoatPolicy = {
    resources: {
      foo: { packages: { 'foo>statically-discovered-dep': true } },
    },
  }
  const result = compactPolicyOverride(override, pureBase)
  t.deepEqual(result.policy, { resources: {} })
  t.true(result.compacted)
})

test('compactPolicyOverride - kitchen sink: strips redundant builtin/globals; keeps override-only packages', (t) => {
  const pureBase: LavaMoatPolicy = {
    resources: {
      '@babel/core': {
        builtin: { fs: true, path: true },
        globals: { 'console.log': true },
      },
      '@babel/preset-env': {
        packages: { '@babel/preset-env>semver': true },
      },
      'html-webpack-plugin': {
        builtin: { url: true },
      },
    },
  }
  const override: LavaMoatPolicy = {
    resources: {
      '@babel/core': {
        builtin: { fs: true, path: true },
        globals: { 'console.log': true },
        packages: {
          '@babel/preset-env': true,
          '@babel/preset-react': true,
          '@babel/preset-typescript': true,
        },
      },
      '@babel/preset-env': {
        packages: { '@babel/preset-env>semver': true },
      },
      'html-webpack-plugin': {
        builtin: { url: true },
      },
      'webpack>loader-runner': {
        packages: { 'babel-loader': true },
      },
    },
  }
  const result = compactPolicyOverride(override, pureBase)
  t.deepEqual(result.policy, {
    resources: {
      '@babel/core': {
        packages: {
          '@babel/preset-env': true,
          '@babel/preset-react': true,
          '@babel/preset-typescript': true,
        },
      },
      'webpack>loader-runner': {
        packages: { 'babel-loader': true },
      },
    },
  })
  t.true(result.compacted)
})
