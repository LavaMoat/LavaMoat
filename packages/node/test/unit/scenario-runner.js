/**
 * Worker thread module which runs against an in-memory filesystem
 *
 * @packageDocumentation
 */
import '../../src/preamble.js'

import { log } from '@lavamoat/vog'
import { memfs } from 'memfs'
import { isMainThread, workerData } from 'node:worker_threads'
import { makeReadPowers } from '../../src/compartment/power.js'
import { run } from '../../src/exec/run.js'

/**
 * @import {FsInterface} from '@endo/compartment-mapper';
 * @import {RunnerWorkerData} from '../types.js';
 */

if (isMainThread) {
  throw new Error('This module is not meant to be run in the main thread')
}

// Since the browserify test uses this vm util as a browser env simulation,
// creating actual dom nodes that can leak the real global object is not possible,
// therefore there is no way to access the real global object otherwise, but since we
// have to (for the scuttling tests) - we intentionally export this util func to solve this:
globalThis.getTrueGlobalThisForTestsOnly = () => globalThis

const { entryPath, policy, vol, scuttleGlobalThis } =
  /** @type {RunnerWorkerData} */ (workerData)

const { fs } = memfs(vol)

const readPowers = makeReadPowers({ fs: /** @type {FsInterface} */ (fs) })

void run(entryPath, { policy, scuttleGlobalThis, readPowers }).catch((err) => {
  // eslint-disable-next-line no-console
  log.error(err)
  process.exitCode = 1
})
