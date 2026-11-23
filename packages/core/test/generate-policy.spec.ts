// dist/ imports because generate-policy has cross-module .js imports that
// Node.js native type stripping cannot resolve. pretest keeps dist/ fresh.
import test from 'ava'
import {
  createModuleInspector,
  getDefaultPaths,
} from '../dist/generate-policy.js'
import { createPolicyForTest, generatePolicyFromFiles } from './helpers.ts'

// #region basic policy generation

test('basic policy', async (t) => {
  const policy = await createPolicyForTest(function () {
    // @ts-expect-error - pretend we're running in a browser
    location.href // eslint-disable-line
  })

  t.deepEqual(policy, {
    resources: {
      test: {
        globals: { 'location.href': true },
      },
    },
  })
})

test('ignore various refs', async (t) => {
  const policy = await createPolicyForTest(function () {
    const ignored = [global, require, module, exports, arguments] // eslint-disable-line
    // @ts-expect-error -- intentional reference to undefined test global
    const globalRefs = [typeof globalThis, typeof self, typeof window] // eslint-disable-line
    // @ts-expect-error -- intentional reference to undefined test global
    const xyz = nonIgnoredGlobal // eslint-disable-line
  })

  t.deepEqual(policy, {
    resources: {
      test: {
        globals: { nonIgnoredGlobal: true },
      },
    },
  })
})

test('policy ignores global refs', async (t) => {
  const policy = await createPolicyForTest(function () {
    // @ts-expect-error -- intentional reference to undefined test global
    const href = window.location.href // eslint-disable-line
    // @ts-expect-error -- intentional reference to undefined test global
    const xhr = new window.XMLHttpRequest() // eslint-disable-line
  })

  t.deepEqual(policy, {
    resources: {
      test: {
        globals: { 'location.href': true, XMLHttpRequest: true },
      },
    },
  })
})

test('policy ignores global refs when properties are not accessed', async (t) => {
  const policy = await createPolicyForTest(function () {
    // @ts-expect-error -- intentional reference to undefined test global
    typeof window !== 'undefined' // eslint-disable-line
  })
  t.deepEqual(policy, { resources: {} })
})

test('policy ignores global refs accessed with whitelist items', async (t) => {
  const policy = await createPolicyForTest(function () {
    // @ts-expect-error -- intentional reference to undefined test global
    window.Object === Object // eslint-disable-line
  })
  t.deepEqual(policy, { resources: {} })
})

test('policy ignores newer intrinsics', async (t) => {
  const policy = await createPolicyForTest(function () {
    BigInt(123)
  })
  t.deepEqual(policy, { resources: {} })
})

test('ESM should flag require/module/exports as global', async (t) => {
  // Use generatePolicyFromFiles directly to avoid IIFE wrapping
  const policy = await generatePolicyFromFiles({
    files: [
      {
        specifier: './entry.js',
        packageName: '$root$',
        content: 'require("test")',
        importMap: { test: './node_modules/test/index.js' },
        entry: true,
      },
      {
        specifier: './node_modules/test/index.js',
        packageName: 'test',
        // mixed ESM + CJS syntax that is intentionally ambiguous
        content: `require('node:util');\nlet e = exports\nlet m = module.exports\nexport const foo = 'bar';`,
        importMap: {},
      },
    ],
  })

  t.deepEqual(policy, {
    resources: {
      test: {
        globals: {
          require: true,
          exports: true,
          'module.exports': true,
        },
      },
    },
  })
})
// #endregion

// #region trusted / untrusted root

test('trusted root - does not create `root` top-level field', async (t) => {
  const policy = await createPolicyForTest(`console.log('hello world')`, {
    trustRoot: true,
  })

  t.deepEqual(policy, {
    resources: {
      test: {
        globals: { 'console.log': true },
      },
    },
  })
})

test('untrusted root - creates a `root` top-level field referencing a resource', async (t) => {
  const policy = await createPolicyForTest(`console.log('hello world')`, {
    trustRoot: false,
  })

  t.deepEqual(policy, {
    root: { usePolicy: '$root$' },
    resources: {
      $root$: { packages: { test: true } },
      test: { globals: { 'console.log': true } },
    },
  })
})
// #endregion

// #region error handling

test('unsupported extensionless file', async (t) => {
  await t.throwsAsync(
    generatePolicyFromFiles({
      files: [
        {
          type: 'js',
          specifier: './entry.js',
          packageName: '$root$',
          importMap: { test: './node_modules/test/index' },
          content: 'require("test")',
          entry: true,
        },
        {
          type: 'js',
          specifier: './node_modules/test/index',
          packageName: 'test',
          content: '<anarchist cookbook>',
        },
      ],
    }),
    {
      message: `LavaMoat - failed to parse extensionless file of unknown format: ./node_modules/test/index`,
    }
  )
})

test('unknown module type throws', (t) => {
  const inspector = createModuleInspector({ isBuiltin: () => false })
  t.throws(
    () =>
      inspector.inspectModule({
        // @ts-expect-error - invalid type for testing
        type: 'unknown-type',
        specifier: './x.js',
        file: './x.js',
        packageName: 'x',
        content: '',
        importMap: {},
        isRoot: false,
      }),
    { message: /unknown module type/ }
  )
})
// #endregion

// #region builtin and native modules

test('builtin modules recorded in policy', async (t) => {
  const policy = await generatePolicyFromFiles({
    isBuiltin: (s) => s === 'node:fs' || s === 'fs',
    files: [
      {
        specifier: './entry.js',
        packageName: '$root$',
        content: 'require("test")',
        importMap: { test: './node_modules/test/index.js' },
        entry: true,
      },
      {
        specifier: './node_modules/test/index.js',
        packageName: 'test',
        // simple require call with no property access
        content: `require('fs');`,
        importMap: { fs: 'fs' },
      },
      {
        specifier: 'fs',
        packageName: 'fs',
        content: '',
        type: 'builtin',
      },
    ],
  })

  t.deepEqual(policy, {
    resources: {
      test: { builtin: { fs: true } },
    },
  })
})

test('native modules marked in policy', async (t) => {
  // A package must have at least one JS module to appear in packageToModules
  // (which drives iteration in generatePolicy). The JS loader requires the
  // native module; the native module itself is recorded via inspectNativeModule.
  const policy = await generatePolicyFromFiles({
    files: [
      {
        specifier: './entry.js',
        packageName: '$root$',
        content: 'require("native-pkg")',
        importMap: { 'native-pkg': './node_modules/native-pkg/index.js' },
        entry: true,
      },
      {
        specifier: './node_modules/native-pkg/index.js',
        packageName: 'native-pkg',
        content: `require('./native.node')`,
        importMap: { './native.node': './node_modules/native-pkg/native.node' },
      },
      {
        specifier: './node_modules/native-pkg/native.node',
        packageName: 'native-pkg',
        content: '',
        type: 'native',
      },
    ],
  })

  t.deepEqual(policy, {
    resources: {
      'native-pkg': { native: true },
    },
  })
})
// #endregion

// #region getDefaultPaths

test('getDefaultPaths returns correct paths for "node"', (t) => {
  const paths = getDefaultPaths('node')
  t.is(paths.policiesDir, 'lavamoat')
  t.is(paths.policyDir, 'lavamoat/node')
  t.is(paths.primary, 'lavamoat/node/policy.json')
  t.is(paths.override, 'lavamoat/node/policy-override.json')
  t.is(paths.debug, 'lavamoat/node/policy-debug.json')
})
// #endregion

// #region policyOverride merge

test('policyOverride is merged into generated policy', async (t) => {
  const policy = await createPolicyForTest(`console.log('hi')`, {
    policyOverride: {
      resources: {
        test: { packages: { 'extra-dep': true } },
      },
    },
  })

  t.deepEqual(policy, {
    resources: {
      test: {
        globals: { 'console.log': true },
        packages: { 'extra-dep': true },
      },
    },
  })
})
// #endregion
