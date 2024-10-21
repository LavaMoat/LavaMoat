/**
 * Worker thread module which runs against an in-memory filesystem
 *
 * @packageDocumentation
 */
import '../src/preamble.js'

import { memfs } from 'memfs'
import { isMainThread, workerData } from 'node:worker_threads'
import { makeReadPowers } from '../src/power.js'
import { run } from '../src/run.js'

/**
 * @import {FsInterface} from '@endo/compartment-mapper';
 * @import {RunnerWorkerData} from './types.js';
 */

if (isMainThread) {
  throw new Error('This module is not meant to be run in the main thread')
}

const { entryPath, policy, opts, vol } = /** @type {RunnerWorkerData} */ (
  workerData
)

const { fs } = memfs(vol)

const readPowers = makeReadPowers(/** @type {FsInterface} */ (fs))

void run(entryPath, policy, { ...opts, readPowers }).catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exitCode = 1
})