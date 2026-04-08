/**
 * Provides {@link createPolicyGenWorkerParser}, which creates an async
 * `ParserImplementation` backed by a worker pool for policy generation.
 *
 * Each worker runs the full pipeline (parse + tofu analysis + evasive
 * transforms + module-source transforms + generate + record building) per
 * module, parallelizing the work across cores.
 *
 * @packageDocumentation
 * @internal
 */

/** @import {BuiltinPolicy, GlobalPolicy, GlobalPolicyValue} from '@lavamoat/types' */
/** @import {ModuleInspectionResult, StructuredViolationsResult} from '../internal.js' */
/** @import {FileUrlString} from '../types.js' */
/** @import {InspectSesCompatResult} from 'lavamoat-tofu' */
/** @import {TerminatableAsyncParserImplementation} from '@endo/parser-pipeline' */

import { createWorkerParser } from '@endo/parser-pipeline'
import { DEFAULT_GLOBAL_THIS_REFS, MODULE_REFS } from 'lavamoat-core'
import { utils as tofuUtils } from 'lavamoat-tofu'
import {
  ALL_BUILTIN_MODULES,
  LAVAMOAT_POLICY_ITEM_READ,
  SOURCE_TYPE_MODULE,
} from '../constants.js'

const { getOwnPropertyNames, freeze, create } = Object
const globalObjPrototypeRefs = getOwnPropertyNames(Object.prototype)
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
 * @param {InspectSesCompatResult | null} violations
 * @param {string} id
 * @returns {StructuredViolationsResult | null}
 */
const formatViolations = (violations, id) => {
  if (!violations) return null
  return {
    primordialMutations: violations.primordialMutations.map((v) => ({
      path: id,
      line: v.node.loc?.start.line ?? 0,
      column: v.node.loc?.start.column ?? 0,
      type: 'primordial mutation',
    })),
    strictModeViolations: violations.strictModeViolations.map((v) => ({
      path: id,
      line: v.loc.line,
      column: v.loc.column,
      type: 'strict-mode violation',
    })),
    dynamicRequires: violations.dynamicRequires.map((v) => ({
      path: id,
      line: v.node.loc?.start.line ?? 0,
      column: v.node.loc?.start.column ?? 0,
      type: 'dynamic requires',
    })),
  }
}

/**
 * Creates an async `ParserImplementation` backed by a worker pool for policy
 * generation.
 *
 * Both ESM and CJS modules are dispatched to workers, which run the full
 * composed pipeline. Results are collected via `onModuleComplete` and stored in
 * the provided `inspectionResults` map.
 *
 * @param {Map<FileUrlString, ModuleInspectionResult>} inspectionResults Map
 *   populated with per-module inspection results.
 * @returns {TerminatableAsyncParserImplementation}
 */
export const createPolicyGenWorkerParser = (inspectionResults) => {
  const moduleRefs = MODULE_REFS[SOURCE_TYPE_MODULE] || []
  const ignoredRefs = [...moduleRefs, ...globalObjPrototypeRefs]

  return createWorkerParser(workerScriptUrl, {
    workerData: {
      globalsOptions: {
        ignoredRefs,
        globalRefs: DEFAULT_GLOBAL_THIS_REFS,
      },
      builtinsOptions: {
        builtinModules,
      },
    },
    onModuleComplete: ({
      location,
      analyzerResults: [
        globalsMap,
        builtinsSet,
        violationsResult,
        _moduleSourceAnalysis,
      ],
    }) => {
      const globalPolicy = globalMapToGlobalPolicy(
        /** @type {Map<string, GlobalPolicyValue>} */ (globalsMap)
      )
      const builtinPolicy = builtinsToPolicy(
        /** @type {Set<string>} */ (builtinsSet)
      )
      const violations = formatViolations(
        /** @type {InspectSesCompatResult | null} */ (violationsResult),
        location
      )
      inspectionResults.set(/** @type {FileUrlString} */ (location), {
        globalPolicy,
        builtinPolicy,
        violations,
      })
    },
  })
}
