/**
 * Provides {@link createPolicyGenParsers}, which creates async
 * `ParserImplementation` instances backed by a worker pool for policy
 * generation.
 *
 * Each worker runs the full pipeline (parse + tofu analysis + evasive
 * transforms + module-source transforms + generate + record building) per
 * module, parallelizing the work across cores.
 *
 * @packageDocumentation
 * @internal
 */

/**
 * @import {AsyncParserImplementation} from '@endo/compartment-mapper'
 * @import {
 *   LogFn,
 *   OnModuleCompleteFn,
 *   OnModuleStartFn
 * } from '@endo/parser-pipeline'
 * @import {
 *   BuiltinPolicy,
 *   GlobalPolicy,
 *   GlobalPolicyValue
 * } from '@lavamoat/types'
 * @import {
 *   CreatePolicyGenWorkerParsersOptions,
 *   ModuleInspectionProgressReporter,
 *   ModuleInspectionResult,
 *   PolicyGenAnalysisResults,
 *   PolicyGenWorkerData,
 *   StructuredViolationsResult,
 *   ViolationsAnalyzerResults
 * } from '../internal.js'
 * @import {FileUrlString} from '../types.js'
 */

import { createParsers } from '@endo/parser-pipeline'
import { log as defaultLog } from '../log.js'
import { DEFAULT_GLOBAL_THIS_REFS, MODULE_REFS } from 'lavamoat-core'
import { utils as tofuUtils } from 'lavamoat-tofu'
import {
  ALL_BUILTIN_MODULES,
  LANGUAGE_CJS,
  LANGUAGE_MJS,
  LAVAMOAT_POLICY_ITEM_READ,
  SOURCE_TYPE_MODULE,
  SOURCE_TYPE_SCRIPT,
} from '../constants.js'

const {
  getOwnPropertyNames,
  freeze,
  create,
  prototype: objectPrototype,
} = Object

const globalObjPrototypeRefs = getOwnPropertyNames(objectPrototype)
const builtinModules = freeze([...ALL_BUILTIN_MODULES])
const workerScriptUrl = new URL('./parse-worker.js', import.meta.url)

/**
 * @param {Map<string, GlobalPolicyValue>} globalMap
 * @returns {GlobalPolicy | null}
 */
const globalMapToGlobalPolicy = (globalMap) => {
  if (!globalMap.size) {
    return null
  }
  /** @type {Record<string, GlobalPolicyValue>} */
  const result = {}
  for (const [key, value] of globalMap.entries()) {
    if (value === LAVAMOAT_POLICY_ITEM_READ) {
      result[key] = true
    } else if (value === 'write' && key.includes('.') && !key.endsWith('.')) {
      const firstDotIndex = key.indexOf('.')
      if (firstDotIndex > 0) {
        result[key.substring(0, firstDotIndex)] = true
      } else {
        result[key] = value
      }
    } else {
      result[key] = value
    }
  }
  return result
}

/**
 * @param {Set<string>} builtins
 * @returns {BuiltinPolicy | null}
 */
const builtinsToPolicy = (builtins) => {
  if (!builtins.size) return null
  const distilled = new Set(
    tofuUtils.reduceToTopmostApiCallsFromStrings([...builtins])
  )
  if (!distilled.size) return null
  /** @type {BuiltinPolicy} */
  const result = create(null)
  for (const mod of distilled) {
    result[mod] = true
  }
  return result
}

/**
 * @param {ViolationsAnalyzerResults | null} violations
 * @param {string} id
 * @returns {StructuredViolationsResult | null}
 */
const formatViolations = (violations, id) => {
  if (!violations) return null
  return {
    primordialMutations: violations.primordialMutations.map((v) => ({
      path: id,
      line: v.line,
      column: v.column,
      type: 'primordial mutation',
    })),
    strictModeViolations: violations.strictModeViolations.map((v) => ({
      path: id,
      line: v.line,
      column: v.column,
      type: 'strict-mode violation',
    })),
    dynamicRequires: violations.dynamicRequires.map((v) => ({
      path: id,
      line: v.line,
      column: v.column,
      type: 'dynamic requires',
    })),
  }
}

/**
 * Creates async `ParserImplementation` instances backed by a single shared
 * worker pool for policy generation — one for ESM (`mjs`) and one for CJS
 * (`cjs`).
 *
 * Provide {@link reporterOptions} to track the progress of the module inspection
 * process.
 *
 * Both parsers dispatch to the same pool of workers. Each dispatch message
 * carries a `language` field so the worker selects the right Babel `sourceType`
 * and visitor passes.
 *
 * Results are collected via `onModuleComplete` and stored in the provided
 * `inspectionResults` map.
 *
 * @param {Map<FileUrlString, ModuleInspectionResult>} inspectionResults Map
 *   populated with per-module inspection results.
 * @param {CreatePolicyGenWorkerParsersOptions} [reporterOptions]
 * @returns {{
 *   mjs: AsyncParserImplementation
 *   cjs: AsyncParserImplementation
 * }}
 */
export const createPolicyGenParsers = (inspectionResults, reporterOptions) => {
  /** @type {NonNullable<CreatePolicyGenWorkerParsersOptions['log']>} */
  let log = defaultLog
  /** @type {ModuleInspectionProgressReporter | undefined} */
  let reporter
  /** @type {Set<string>} */
  let modulesToInspect = new Set()
  /** @type {Set<string>} */
  let inspectedModules = new Set()
  if (reporterOptions) {
    log = reporterOptions.log ?? log
    if ('reporter' in reporterOptions) {
      reporter = reporterOptions.reporter
      modulesToInspect = reporterOptions.modulesToInspect
      inspectedModules = reporterOptions.inspectedModules
    }
  }

  const esmModuleRefs = MODULE_REFS[SOURCE_TYPE_MODULE] ?? []
  const cjsModuleRefs = MODULE_REFS[SOURCE_TYPE_SCRIPT] ?? []
  const esmIgnoredRefs = new Set([...esmModuleRefs, ...globalObjPrototypeRefs])
  const cjsIgnoredRefs = new Set([...cjsModuleRefs, ...globalObjPrototypeRefs])

  /** @type {PolicyGenWorkerData} */
  const workerData = {
    globalRefs: DEFAULT_GLOBAL_THIS_REFS,
    globalsOptionsByLanguage: {
      [LANGUAGE_MJS]: { ignoredRefs: [...esmIgnoredRefs] },
      [LANGUAGE_CJS]: { ignoredRefs: [...cjsIgnoredRefs] },
    },
    builtinModules,
  }

  /**
   * Called after each module is fully analyzed. Writes per-module policy data
   * into `inspectionResults` and updates progress reporting.
   *
   * `analyzerResults` is a one-element tuple containing the combined result
   * from `createPolicyGenAnalyzerPass`, which performs all three logical
   * analyses (globals, builtins, violations) in a single AST traversal.
   *
   * @type {OnModuleCompleteFn<[PolicyGenAnalysisResults]>}
   */
  const onModuleComplete = ({
    location,
    visitorResults: [{ globals, builtins, violations: violationsResult }],
  }) => {
    inspectedModules.add(location)
    const globalPolicy = globalMapToGlobalPolicy(globals)
    const builtinPolicy = builtinsToPolicy(builtins)
    const violations = formatViolations(violationsResult, location)
    inspectionResults.set(/** @type {FileUrlString} */ (location), {
      globalPolicy,
      builtinPolicy,
      violations,
    })
    reporter?.reportModuleInspectionProgress(inspectedModules, modulesToInspect)
  }

  /** @type {OnModuleStartFn} */
  const onModuleStart = (location) => {
    modulesToInspect.add(location)
    if (inspectedModules.size > 0) {
      reporter?.reportModuleInspectionProgress(
        inspectedModules,
        modulesToInspect
      )
    }
  }

  const { async: asyncParsers } = createParsers({
    workerScript: workerScriptUrl,
    workerData,
    log: /** @type {LogFn} */ (log.debug.bind(log)),
    onModuleStart,
    onModuleComplete,
  })

  return {
    mjs: asyncParsers[LANGUAGE_MJS],
    cjs: asyncParsers[LANGUAGE_CJS],
  }
}
