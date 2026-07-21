const test = /** @type {import('ava').TestFn} */ (require('ava'))
const path = require('node:path')
const { runtimeBuilder } = require('../src/runtime/runtimeBuilder.js')

/**
 * These tests verify that the LavaMoat runtime output is deterministic
 * regardless of the iteration order of the inputs.
 *
 * `identifiersForModuleIds`, `chunkIds`, `unenforceableModuleIds`, and
 * `contextModuleIds` are collected by iterating webpack's `compilation.chunks`
 * (a Set with non-deterministic iteration order) and have caused the resulting
 * runtime to not be deterministic.
 *
 * This is the 3rd approach to testing this. Vibes were pruned.
 */

const MOCK_PROGRESS = { report() {} }
const MOCK_CHUNK = { name: 'app' }

/**
 * Extracts all generated source strings from the VirtualRuntimeModule array.
 */
function extractSources(modules) {
  return modules.map((m) => m.generate()).join('\n')
}

/**
 * Builds the full runtime output via getLavaMoatRuntimeModules with the given
 * parameters and plugin options.
 */
function buildRuntime({ pluginOptions, chunkIds, identifiers, policyData }) {
  const builder = runtimeBuilder({ options: pluginOptions })
  const modules = builder.getLavaMoatRuntimeModules({
    PROGRESS: MOCK_PROGRESS,
    currentChunk: MOCK_CHUNK,
    chunkIds,
    policyData,
    identifiers,
    chunkLoaderName: 'webpackChunkmy_app',
  })
  return extractSources(modules)
}

const SHIM_FILE = path.join(__dirname, 'fixtures/static-shims/shim-lockdown.js')

const head = (str) => str.slice(0, 500)

test('getLavaMoatRuntimeModules output is stable with readableResourceIds (string identifiers)', (t) => {
  const policyData = {
    resources: {
      'package-a': { globals: { console: true } },
      'package-b': { globals: { setTimeout: true } },
      'package-c': { packages: { 'package-a': true } },
    },
  }

  const pluginOptions = {
    skipRepairs: true,
    readableResourceIds: true,
    lockdown: { errorTaming: 'unsafe' },
    scuttleGlobalThis: { enabled: false },
    staticShims_experimental: [SHIM_FILE],
  }

  const outputA = buildRuntime({
    pluginOptions,
    chunkIds: ['main', 'vendor', 'runtime', 792],
    policyData,
    identifiers: {
      root: '$root$',
      identifiersForModuleIds: [
        ['package-a', [1, 2, 3]],
        ['package-b', [4, 5]],
        ['package-c', [6, 7]],
      ],
      unenforceableModuleIds: [10, 20, 30],
      contextModuleIds: [100, 200, 300],
      externals: { 40: 'fs', 50: 'path', 60: 'crypto' },
    },
  })

  const outputB = buildRuntime({
    pluginOptions,
    chunkIds: [792, 'runtime', 'main', 'vendor'],
    policyData,
    identifiers: {
      root: '$root$',
      identifiersForModuleIds: [
        ['package-c', [7, 6]],
        ['package-a', [3, 1, 2]],
        ['package-b', [5, 4]],
      ],
      unenforceableModuleIds: [30, 10, 20],
      contextModuleIds: [300, 100, 200],
      externals: { 60: 'crypto', 40: 'fs', 50: 'path' },
    },
  })

  t.is(head(outputA), head(outputB), 'first 500 chars must match')
  t.is(outputA, outputB)
})

test('getLavaMoatRuntimeModules output is stable without readableResourceIds (numeric identifiers)', (t) => {
  const policyData = {
    resources: {
      1: { globals: { console: true } },
      2: { globals: { setTimeout: true } },
      3: { packages: { 1: true } },
    },
  }

  const pluginOptions = {
    skipRepairs: true,
    lockdown: { errorTaming: 'unsafe' },
    scuttleGlobalThis: { enabled: false },
    staticShims_experimental: [SHIM_FILE],
  }

  const outputA = buildRuntime({
    pluginOptions,
    chunkIds: ['main', 'vendor', 'runtime', 792],
    policyData,
    identifiers: {
      root: '0',
      identifiersForModuleIds: [
        ['1', [1, 2, 3]],
        ['2', [4, 5]],
        ['3', [6, 7]],
      ],
      unenforceableModuleIds: [10, 20, 30],
      contextModuleIds: [100, 200, 300],
      externals: { 40: 'fs', 50: 'path', 60: 'crypto' },
    },
  })

  const outputB = buildRuntime({
    pluginOptions,
    chunkIds: [792, 'runtime', 'main', 'vendor'],
    policyData,
    identifiers: {
      root: '0',
      identifiersForModuleIds: [
        ['3', [7, 6]],
        ['1', [3, 1, 2]],
        ['2', [5, 4]],
      ],
      unenforceableModuleIds: [30, 10, 20],
      contextModuleIds: [300, 100, 200],
      externals: { 60: 'crypto', 40: 'fs', 50: 'path' },
    },
  })

  t.is(head(outputA), head(outputB), 'first 500 chars must match')
  t.is(outputA, outputB)
})

test('getLavaMoatRuntimeModules output is stable with scuttling enabled and reordered inputs', (t) => {
  const policyData = {
    resources: {
      'package-a': { globals: { fetch: true } },
      'package-b': { globals: { document: true } },
    },
  }

  const pluginOptions = {
    skipRepairs: true,
    lockdown: { errorTaming: 'unsafe' },
    scuttleGlobalThis: {
      enabled: true,
      exceptions: ['chrome', 'browser'],
    },
    staticShims_experimental: [SHIM_FILE],
  }

  const outputA = buildRuntime({
    pluginOptions,
    chunkIds: ['background', 'content', 'popup', 101],
    policyData,
    identifiers: {
      root: '$root$',
      identifiersForModuleIds: [
        ['package-a', [1, 2]],
        ['package-b', [3, 4, 5]],
      ],
      unenforceableModuleIds: [99, 88, 77],
      contextModuleIds: [500, 600],
      externals: { 7: 'events', 8: 'stream', 9: 'buffer' },
    },
  })

  const outputB = buildRuntime({
    pluginOptions,
    chunkIds: [101, 'popup', 'background', 'content'],
    policyData,
    identifiers: {
      root: '$root$',
      identifiersForModuleIds: [
        ['package-b', [5, 3, 4]],
        ['package-a', [2, 1]],
      ],
      unenforceableModuleIds: [77, 99, 88],
      contextModuleIds: [600, 500],
      externals: { 9: 'buffer', 7: 'events', 8: 'stream' },
    },
  })

  t.is(head(outputA), head(outputB), 'first 500 chars must match')
  t.is(outputA, outputB)
})

test('getLavaMoatRuntimeModules output is stable with no optional fields and reordered inputs', (t) => {
  const policyData = {
    resources: {
      'only-pkg': { globals: { console: true } },
    },
  }

  const pluginOptions = {
    skipRepairs: true,
    lockdown: { errorTaming: 'unsafe' },
  }

  const outputA = buildRuntime({
    pluginOptions,
    chunkIds: ['main', 'chunk-abc', 555],
    policyData,
    identifiers: {
      root: '$root$',
      identifiersForModuleIds: [['only-pkg', [10, 20, 30, 40]]],
      unenforceableModuleIds: ['x', 'y', 'z'],
      contextModuleIds: [1, 2, 3, 4, 5],
    },
  })

  const outputB = buildRuntime({
    pluginOptions,
    chunkIds: [555, 'chunk-abc', 'main'],
    policyData,
    identifiers: {
      root: '$root$',
      identifiersForModuleIds: [['only-pkg', [40, 30, 10, 20]]],
      unenforceableModuleIds: ['z', 'x', 'y'],
      contextModuleIds: [5, 3, 1, 4, 2],
    },
  })

  t.is(head(outputA), head(outputB), 'first 500 chars must match')
  t.is(outputA, outputB)
})
