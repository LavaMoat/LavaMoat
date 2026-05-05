/**
 * Worker thread entry point for policy-generation parsing.
 *
 * Runs the full pipeline (parse + tofu analysis + evasive transforms +
 * LavaMoat-local transforms + module-source transforms + generate + record
 * building) per module in a worker thread.
 *
 * Configuration is received via `workerData` at spawn time and passed to
 * {@link createPolicyGenPipelineConfig}. The resulting config is structurally
 * identical to the per-language factories used on the main thread, ensuring
 * the visitor logic stays in sync.
 *
 * @packageDocumentation
 * @internal
 */

import { runPipelineInWorker } from '@endo/parser-pipeline'
import { parentPort, workerData } from 'node:worker_threads'
import { createPolicyGenPipelineConfig } from './pipeline-config.js'
import { log } from '../log.js'

/**
 * @import {LogFn} from '@endo/parser-pipeline'
 * @import {PolicyGenWorkerData} from '../internal.js'
 */

if (!parentPort) {
  throw new Error('This module must be run as a worker thread')
}

/** @type {PolicyGenWorkerData} */
const { globalRefs, globalsOptionsByLanguage = {}, builtinModules } = workerData

runPipelineInWorker(
  parentPort,
  createPolicyGenPipelineConfig({
    globalRefs,
    globalsOptionsByLanguage,
    builtinModules,
  }),
  { log: /** @type {LogFn} */ (log.info.bind(log)) }
)
