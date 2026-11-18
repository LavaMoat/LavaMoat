/**
 * Worker thread module for exec macro tests.
 *
 * Runs a LavaMoat-protected entry point and posts an {@link ExecRunnerMessage}
 * back to the parent.
 *
 * @packageDocumentation
 */
import '../../../src/preamble.js'

import { isMainThread, parentPort, workerData } from 'node:worker_threads'
import { run } from '../../../src/exec/run.js'
import {
  DEFAULT_JSON_FIXTURE_ENTRY_POINT,
  JSON_FIXTURE_DIR_URL,
  loadJSONFixture,
} from '../json-fixture-util.js'

/**
 * @import {ExecRunnerWorkerData, ExecRunnerMessage, ExecRunnerWorkerDataJson} from '../../types.js'
 */

if (isMainThread) {
  throw new Error('This module is not meant to be run in the main thread')
}

if (!parentPort) {
  throw new Error('Parent port is not available')
}

/**
 * Runs a JSON fixture.
 *
 * @param {ExecRunnerWorkerDataJson} data
 * @returns {Promise<unknown>}
 */
const runJsonFixture = async (data) => {
  const { readPowers } = await loadJSONFixture(
    new URL(data.fixtureFilename, JSON_FIXTURE_DIR_URL)
  )
  return run(data.jsonEntrypoint ?? DEFAULT_JSON_FIXTURE_ENTRY_POINT, {
    policy: data.policy,
    readPowers,
  })
}

const data = /** @type {ExecRunnerWorkerData} */ (workerData)

/** @type {ExecRunnerMessage} */
let msg
try {
  /** @type {unknown} */
  let result

  if (data.isJsonFixture) {
    result = await runJsonFixture(data)
  } else {
    result = await run(data.entryPath, { policy: data.policy })
  }

  msg = {
    type: 'success',
    result: { .../** @type {any} */ (result) },
  }
} catch (e) {
  const error = e instanceof Error ? e : new Error(String(e), { cause: e })
  msg = {
    type: 'error',
    error,
  }
}

parentPort.postMessage(msg)
