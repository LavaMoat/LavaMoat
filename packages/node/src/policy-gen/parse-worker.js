/**
 * Worker thread entry point for policy-generation parsing.
 *
 * Imports all visitor modules and runs the full pipeline (parse + tofu analysis
 * + evasive transforms + module-source transforms + generate + record building)
 * per module, in a worker thread.
 *
 * Configuration is received via `workerData` at spawn time.
 *
 * @packageDocumentation
 * @internal
 */

import { createEvasiveTransformPass } from '@endo/evasive-transform'
import { createModuleSourcePasses } from '@endo/module-source'
import { runPipelineInWorker } from '@endo/parser-pipeline/worker'
import {
  createBuiltinsAnalyzerPass,
  createGlobalsAnalyzerPass,
  createViolationsAnalyzerPass,
} from 'lavamoat-tofu'
import { parentPort, workerData } from 'node:worker_threads'
import { useLocalTransforms } from '../compartment/module-transforms.js'

if (!parentPort) {
  throw new Error('This module must be run as a worker thread')
}

const { globalsOptions, builtinsOptions } = workerData

runPipelineInWorker(parentPort, {
  createAnalyzerPasses: (_location, _specifier) => [
    createGlobalsAnalyzerPass(globalsOptions),
    createBuiltinsAnalyzerPass(builtinsOptions),
    createViolationsAnalyzerPass(),
  ],

  createTransformPasses: (_location, _specifier) => {
    const ms = createModuleSourcePasses()
    return {
      passes: [createEvasiveTransformPass(), ms.transformPass],
      analyzerPass: ms.analyzerPass,
      buildRecord: ms.buildRecord,
    }
  },

  sourcePreprocessor: useLocalTransforms,
})
