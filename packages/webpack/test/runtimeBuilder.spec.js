const test = /** @type {import('ava').TestFn} */ (require('ava'))
const { runtimeBuilder } = require('../src/runtime/runtimeBuilder.js')

/**
 * @param {Object} params
 * @param {(string | number)[]} params.chunkIds
 * @param {{
 *   root: string
 *   identifiersForModuleIds: [string, (string | number)[]][]
 *   unenforceableModuleIds: (string | number)[]
 *   contextModuleIds: (string | number)[]
 *   externals: Record<string | number, string>
 * }} params.identifiers
 * @returns {string}
 */
const getRuntimeSource = ({ chunkIds, identifiers }) => {
  const { getLavaMoatRuntimeModules } = runtimeBuilder({
    options: { skipRepairs: true },
  })
  const runtimeModules = getLavaMoatRuntimeModules({
    PROGRESS: { report() {} },
    currentChunk: { name: 'runtime' },
    chunkIds,
    policyData: { resources: {} },
    identifiers,
    chunkLoaderName: 'webpackChunk',
  })

  return runtimeModules.find(({ name }) => name === 'LavaMoat/runtime')
    .virtualSource
}

test('runtimeBuilder emits module and chunk lookup data deterministically', (t) => {
  const commonIdentifiers = {
    root: '$root$',
    unenforceableModuleIds: ['u2', 1, 'u1'],
    contextModuleIds: [9, 'ctx', 2],
    externals: { z: 'z-ext', a: 'a-ext' },
  }

  const firstRuntimeSource = getRuntimeSource({
    chunkIds: [20, 3, 'vendor', 'app'],
    identifiers: {
      ...commonIdentifiers,
      identifiersForModuleIds: [
        ['b', [20, 3]],
        ['a', ['z', 'a']],
      ],
    },
  })

  const secondRuntimeSource = getRuntimeSource({
    chunkIds: ['app', 'vendor', 3, 20],
    identifiers: {
      ...commonIdentifiers,
      identifiersForModuleIds: [
        ['a', ['a', 'z']],
        ['b', [3, 20]],
      ],
    },
  })

  t.is(firstRuntimeSource, secondRuntimeSource)
})
