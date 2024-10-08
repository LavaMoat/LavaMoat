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

const { entryPath, policy, opts, vol } =
  /** @type {import('./types.js').RunnerWorkerData} */ (workerData)

const { fs } = memfs(vol)

const readPowers = makeReadPowers(
  /** @type {import('@endo/compartment-mapper').FsInterface} */ (fs)
)

await run(entryPath, policy, { ...opts, readPowers })
