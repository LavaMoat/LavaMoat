/**
 * Provides {@link createPolicyGenParser}, a composed parser that performs
 * evasive transforms, module-source analysis, and tofu inspection in a single
 * parse-traverse-generate cycle.
 *
 * @packageDocumentation
 * @internal
 */

/** @import {BuiltinPolicy, GlobalPolicy, GlobalPolicyValue} from '@lavamoat/types' */
/** @import {StructuredViolationsResult, ModuleInspectionResult} from '../internal.js' */
/** @import {FileUrlString} from '../types.js' */
/** @import {InspectSesCompatResult} from 'lavamoat-tofu' */
/** @import {RecordBuilder} from '@endo/module-analyzer' */
/** @import {ParserImplementation} from '@endo/compartment-mapper' */

import { createEvasiveTransformPass } from '@endo/evasive-transform'
import { createComposedParser } from '@endo/module-analyzer'
import { createModuleSourcePasses } from '@endo/module-source'
import { DEFAULT_GLOBAL_THIS_REFS, MODULE_REFS } from 'lavamoat-core'
import {
  createBuiltinsAnalyzerPass,
  createGlobalsAnalyzerPass,
  createViolationsAnalyzerPass,
  utils as tofuUtils,
} from 'lavamoat-tofu'
import { useLocalTransforms } from '../compartment/module-transforms.js'
import {
  ALL_BUILTIN_MODULES,
  LAVAMOAT_POLICY_ITEM_READ,
  SOURCE_TYPE_MODULE,
} from '../constants.js'

const { getOwnPropertyNames, freeze, create } = Object
const globalObjPrototypeRefs = getOwnPropertyNames(Object.prototype)
const builtinModules = freeze([...ALL_BUILTIN_MODULES])

/**
 * Converts the raw globals map from tofu into a {@link GlobalPolicy}.
 *
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
        const rootKey = key.substring(0, firstDotIndex)
        result[rootKey] = true
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
 * Converts a set of builtin module references into a {@link BuiltinPolicy}.
 *
 * @param {Set<string>} builtins
 * @returns {BuiltinPolicy | null}
 */
const builtinsToPolicy = (builtins) => {
  if (!builtins.size) {
    return null
  }

  const distilledImports = tofuUtils.reduceToTopmostApiCallsFromStrings([
    ...builtins,
  ])
  const distilledSet = new Set(distilledImports)

  if (!distilledSet.size) {
    return null
  }

  /** @type {BuiltinPolicy} */
  const result = create(null)
  for (const mod of distilledSet) {
    result[mod] = true
  }
  return result
}

/**
 * Converts violations result into the structured format expected by the policy
 * reporter.
 *
 * @param {InspectSesCompatResult | null} violations
 * @param {string} id Module file URL
 * @returns {StructuredViolationsResult | null}
 */
const formatViolations = (violations, id) => {
  if (!violations) {
    return null
  }

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
 * Creates a composed parser for ESM modules that performs evasive transforms,
 * module-source analysis, AND tofu policy inspection in a single
 * parse-traverse-generate cycle.
 *
 * Results are stored in the provided `inspectionResults` map, keyed by module
 * file URL. The caller is responsible for mapping these to canonical package
 * names.
 *
 * @param {Map<FileUrlString, ModuleInspectionResult>} inspectionResults Map
 *   populated with per-module inspection results.
 * @returns {ParserImplementation}
 */
export const createPolicyGenParser = (inspectionResults) => {
  const moduleRefs = MODULE_REFS[SOURCE_TYPE_MODULE] || []
  const ignoredRefs = [...moduleRefs, ...globalObjPrototypeRefs]

  /** @type {ReturnType<typeof createModuleSourcePasses> | undefined} */
  let currentModuleSourceState

  /** @type {RecordBuilder} */
  const recordBuilder = (generatedCode, location) => {
    if (!currentModuleSourceState) {
      throw new Error(
        'Module source state not initialized; cannot build record'
      )
    }
    return currentModuleSourceState.buildRecord(generatedCode, location)
  }

  return createComposedParser(recordBuilder, {
    analyzerFactories: [
      // Tofu: globals detection (read-only)
      (_location, _specifier) =>
        createGlobalsAnalyzerPass({
          ignoredRefs,
          globalRefs: DEFAULT_GLOBAL_THIS_REFS,
        }),
      // Tofu: builtin imports detection (read-only)
      (_location, _specifier) => createBuiltinsAnalyzerPass({ builtinModules }),
      // Tofu: SES compatibility violations (read-only)
      (_location, _specifier) => createViolationsAnalyzerPass(),
      // Module-source: import/export analysis (read-only; creates shared
      // state used by the module-source transform factory below)
      (_location, _specifier) => {
        currentModuleSourceState = createModuleSourcePasses()
        return currentModuleSourceState.analyzerPass
      },
    ],

    transformFactories: [
      // Evasive transforms: defang SES-forbidden patterns
      (_location, _specifier) =>
        createEvasiveTransformPass({
          // elideComments: true, would clean up a lot
        }),
      // Module-source: ESM → SES-compatible script functor (mutating;
      // uses shared state created by the analyzer factory above)
      (_location, _specifier) => {
        if (!currentModuleSourceState) {
          throw new Error(
            'Module source state not initialized; analyzer factory must run first'
          )
        }
        return currentModuleSourceState.transformPass
      },
    ],

    sourcePreprocessor: useLocalTransforms,

    // TODO: When the CJS lexer is replaced with Babel AST parsing,
    // add CJS analyzer and transform factories here alongside the ESM ones.
    // The pipeline's analyzerFactories/transformFactories arrays support this.

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
