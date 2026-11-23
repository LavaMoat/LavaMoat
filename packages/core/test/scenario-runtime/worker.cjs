// @ts-check
/**
 * Worker thread that runs a single scenario fixture under LavaMoat.
 *
 * Receives its configuration via `workerData`:
 *
 * ```ts
 * {
 *   entryPath: string          // absolute path to the scenario's entry.js
 *   policy: LavaMoatPolicy     // merged policy
 *   setupPath?: string         // optional setup.js (run before lockdown)
 *   scuttleGlobalThis?: LavaMoatScuttleOpts
 *   globalThisRefs?: string[]
 * }
 * ```
 *
 * Result protocol: if the scenario succeeds, the entry calls
 * `console.log(JSON.stringify(result))` exactly once and the worker exits 0. On
 * unhandled failure the worker exits non-zero and writes to stderr.
 *
 * @packageDocumentation
 */
'use strict'

/**
 * @import {RunnerWorkerData} from '../scenario'
 */

/* global lockdown */

const path = require('node:path')
const { workerData, isMainThread } = require('node:worker_threads')

if (isMainThread) {
  throw new Error(
    'scenario-runtime/worker.cjs must not be run in the main thread'
  )
}

const { entryPath, policy, setupPath, scuttleGlobalThis, globalThisRefs } =
  /** @type {RunnerWorkerData} */ (workerData)

// Expose the real globalThis for scuttle-related tests that need to verify
// the underlying realm object.
globalThis.getTrueGlobalThisForTestsOnly = () => globalThis

/** @type {Record<string, unknown>} */
let extraBuiltins = {}

if (setupPath) {
  // setup.js may:
  //   - assign properties on globalThis (globals that appear in `context`)
  //   - export { builtins } for fake builtins (core/ fixtures only)
  const setupExports = require(setupPath)
  if (
    setupExports &&
    typeof setupExports === 'object' &&
    setupExports.builtins
  ) {
    extraBuiltins = /** @type {any} */ (setupExports).builtins
  }
}

require('ses')

// Options mirror kernelTemplate.js defaults
lockdown({
  reporting: 'none',
  errorTaming: 'unsafe',
  stackFiltering: 'verbose',
  overrideTaming: 'severe',
  localeTaming: 'unsafe',
})

const { run } = require(path.join(__dirname, 'reference-runtime.cjs'))

run({
  entryPath,
  policy,
  extraBuiltins,
  scuttleGlobalThis: scuttleGlobalThis ?? { enabled: false },
  globalThisRefs: globalThisRefs ?? ['globalThis', 'global'],
})
