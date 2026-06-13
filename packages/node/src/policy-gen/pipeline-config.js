/**
 * Provides {@link createPolicyGenPipelineConfig}, the pipeline configuration for
 * policy-generation parsing.
 *
 * This module is **worker-only**. It is imported by {@link parse-worker.js} to
 * wire up the Babel visitor passes inside the worker thread. The main thread
 * does not import it; hooks (`onModuleStart`, `onModuleComplete`) and pool
 * options are supplied directly to `createParsers` in
 * {@link policy-gen-parsers.js}.
 *
 * @packageDocumentation
 * @internal
 */

import { createPolicyGenVisitor } from './policy-gen-visitor.js'
import { LANGUAGE_CJS, LANGUAGE_MJS } from '../constants.js'

/**
 * @import {PipelineConfig} from "@endo/parser-pipeline"
 * @import {
 *   PolicyGenAnalysisResults,
 *   PolicyGenWorkerData
 * } from "../internal.js"
 */

/**
 * Builds the `PipelineConfig` for policy-generation parsing.
 *
 * Registers one `createPolicyGenAnalyzerPass` per language, each configured
 * with language-specific globals options. A single pass performs all three
 * logical analyses (globals, builtins, violations) in one AST traversal,
 * returning a named `{ globals, builtins, violations }` result.
 *
 * No transform factories are needed for policy generation.
 *
 * @param {PolicyGenWorkerData} workerData
 * @returns {PipelineConfig<[PolicyGenAnalysisResults]>}
 */
export const createPolicyGenPipelineConfig = ({
  globalRefs,
  globalsOptionsByLanguage = {},
  builtinModules,
}) => {
  const mjsGlobalsOptions = {
    globalRefs,
    ...globalsOptionsByLanguage[LANGUAGE_MJS],
  }
  const cjsGlobalsOptions = {
    globalRefs,
    ...globalsOptionsByLanguage[LANGUAGE_CJS],
  }

  /** @type {PipelineConfig<[PolicyGenAnalysisResults]>} */
  const config = {
    mjs: {
      visitorFactories: [
        () => createPolicyGenVisitor({ ...mjsGlobalsOptions, builtinModules }),
      ],
    },
    cjs: {
      visitorFactories: [
        () => createPolicyGenVisitor({ ...cjsGlobalsOptions, builtinModules }),
      ],
    },
  }
  return config
}
