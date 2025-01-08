/**
 * Worker thread module which runs against an in-memory filesystem
 *
 * @packageDocumentation
 */
import '../../src/preamble.js'

import { memfs } from 'memfs'
import { isMainThread, workerData } from 'node:worker_threads'
import { makeReadPowers } from '../../src/compartment/power.js'
import { run } from '../../src/exec/run.js'
import { log } from '../../src/log.js'

/**
 * @import {FsInterface} from '@endo/compartment-mapper';
 * @import {RunnerWorkerData} from '../types.js';
 */

if (isMainThread) {
  throw new Error('This module is not meant to be run in the main thread')
}

const { entryPath, policy, vol } = /** @type {RunnerWorkerData} */ (workerData)

const { fs } = memfs(vol)

const readPowers = makeReadPowers({ fs: /** @type {FsInterface} */ (fs) })

void run(entryPath, policy, { readPowers }).catch((err) => {
  // eslint-disable-next-line no-console
  log.error(err)
  process.exitCode = 1
})
