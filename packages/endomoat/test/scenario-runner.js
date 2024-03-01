/**
 * Worker thread module which runs against an in-memory filesystem
 *
 * @packageDocumentation
 */

import { memfs } from 'memfs'
import { isMainThread, workerData } from 'node:worker_threads'
import { run } from '../src/index.js'
import { makeReadPowers } from '../src/power.js'
if (isMainThread) {
  throw new Error('This module is not meant to be run in the main thread')
}

/**
 * @typedef {Omit<import('../src/types.js').RunOptions, 'readPowers'>} RunnerWorkerOptions
 */

/**
 * @typedef RunnerWorkerData
 * @property {string} entryPath - Path of entry module
 * @property {import('lavamoat-core').LavaMoatPolicy} policy Lavamoat policy
 * @property {RunnerWorkerOptions} [opts] Options
 * @property {import('memfs').NestedDirectoryJSON} vol JSON representation of
 *   filesystem
 */

const { entryPath, policy, opts, vol } = /** @type {RunnerWorkerData} */ (
  workerData
)

const { fs } = memfs(vol)

const readPowers = makeReadPowers(
  /** @type {import('@endo/compartment-mapper').FsAPI} */ (fs)
)

await run(entryPath, policy, { ...opts, readPowers })
