/**
 * Provides {@link loadAndGeneratePolicy}, which returns a compartment map
 * descriptor for a given entrypoint.
 *
 * @packageDocumentation
 * @internal
 */

import { captureFromMap } from '@endo/compartment-mapper/capture-lite.js'
import chalk from 'chalk'
import { utils as tofuUtils } from 'lavamoat-tofu'
import { nullImportHook } from '../compartment/import-hook.js'
import { makeNodeCompartmentMap } from '../compartment/node-compartment-map.js'
import { DEFAULT_ENDO_OPTIONS } from '../compartment/options.js'
import { defaultReadPowers } from '../compartment/power.js'
import {
  ALL_BUILTIN_MODULES,
  DEFAULT_TRUST_ROOT_COMPARTMENT,
  LANGUAGE_CJS,
  LANGUAGE_MJS,
  ROOT_COMPARTMENT,
} from '../constants.js'
import { GenerationError } from '../error.js'
import { hrLabel } from '../format.js'
import { log as defaultLog } from '../log.js'
import { mergePolicies } from '../policy-util.js'
import { reportInvalidCanonicalNames, reportSesViolations } from '../report.js'
import { pluralize } from '../util.js'
import { createPolicyGenWorkerParser } from './worker-parser.js'

/**
 * @import {LoadAndGeneratePolicyOptions,
 *   LoadCompartmentMapResult,
 *   StructuredViolationsResult,
 *   ModuleInspectionResult} from '../internal.js'
 * @import {CanonicalName} from '@endo/compartment-mapper'
 * @import {BuiltinPolicy, GlobalPolicy, LavaMoatPolicy, PackagePolicy} from '@lavamoat/types'
 * @import {MergedLavaMoatPolicy, FileUrlString} from '../types.js'
 */

const { keys } = Object

/**
 * Loads the compartment map for a given entrypoint, inspects all modules for
 * globals, builtins, and SES compatibility violations, and compiles a policy.
 *
 * All module parsing and analysis is parallelized across worker threads via
 * the async worker parser. Both ESM and CJS modules go through the worker
 * pool, which runs the full composed pipeline (parse + tofu analysis +
 * evasive transforms + module-source analysis + generate + record building)
 * per module.
 *
 * @param {string | URL} entrypointPath
 * @param {LoadAndGeneratePolicyOptions} options
 * @returns {Promise<LoadCompartmentMapResult>}
 * @internal
 */
export const loadAndGeneratePolicy = async (
  entrypointPath,
  {
    readPowers = defaultReadPowers,
    policyOverride,
    trustRoot = DEFAULT_TRUST_ROOT_COMPARTMENT,
    log = defaultLog,
    prodOnly,
    ...options
  } = {}
) => {
  const {
    packageJsonMap,
    packageCompartmentMap,
    unknownCanonicalNames,
    knownCanonicalNames,
    rootUsePolicy,
  } = await makeNodeCompartmentMap(entrypointPath, {
    readPowers,
    prodOnly,
    log,
    trustRoot,
    policyOverride,
  })

  /* c8 ignore next */
  if (!trustRoot && !rootUsePolicy) {
    throw new GenerationError(
      `Root compartment is not trusted, but no data for root.usePolicy exists`
    )
  }

  /** @type {Map<CanonicalName, GlobalPolicy>} */
  const globalsForPackage = new Map()

  /** @type {Map<CanonicalName, BuiltinPolicy>} */
  const builtinsForPackage = new Map()

  /** @type {Map<CanonicalName, PackagePolicy>} */
  const packagePoliciesMap = new Map()

  /** @type {Map<CanonicalName, StructuredViolationsResult>} */
  const violationsForPackage = new Map()

  /**
   * Per-module inspection results populated by the worker parser's
   * `onModuleComplete` callback. Keyed by module file URL; consumed by
   * `moduleSourceHook` to map locations to canonical package names.
   *
   * @type {Map<FileUrlString, ModuleInspectionResult>}
   */
  const inspectionResults = new Map()

  const workerParser = createPolicyGenWorkerParser(inspectionResults)

  let totalModuleCount = 0

  const preload = policyOverride?.include?.map((include) =>
    typeof include === 'string'
      ? { compartment: include, entry: '.' }
      : { compartment: include.name, entry: include.entry }
  )

  /** @type {string[]} */
  const warnings = []

  try {
    log.info('Inspecting modules; please wait…')
    await captureFromMap(readPowers, packageCompartmentMap, {
      ...DEFAULT_ENDO_OPTIONS,
      parserForLanguage: {
        ...DEFAULT_ENDO_OPTIONS.parserForLanguage,
        mjs: workerParser,
        cjs: workerParser,
      },
      // All transforms are now handled inside the worker parser pipeline.
      // No syncModuleTransforms needed for policy gen.
      syncModuleTransforms: {},
      importHook: nullImportHook,
      log: log.debug.bind(log),
      _preload: preload,
      packageConnectionsHook: ({
        canonicalName: rawCanonicalName,
        connections,
      }) => {
        if (!rootUsePolicy && rawCanonicalName === ROOT_COMPARTMENT) {
          return
        }
        const canonicalName =
          rawCanonicalName === ROOT_COMPARTMENT && rootUsePolicy
            ? rootUsePolicy
            : rawCanonicalName
        const packagePolicy = packagePoliciesMap.get(canonicalName) ?? {}
        for (const connection of connections) {
          if (connection !== canonicalName) {
            packagePolicy[connection] = true
          }
        }
        if (keys(packagePolicy).length > 0) {
          packagePoliciesMap.set(canonicalName, packagePolicy)
        }
      },
      moduleSourceHook: ({ moduleSource, canonicalName: rawCanonicalName }) => {
        if ('exit' in moduleSource) {
          if (
            !ALL_BUILTIN_MODULES.has(moduleSource.exit) &&
            !moduleSource.exit.endsWith('package.json')
          ) {
            warnings.push(
              `${hrLabel(moduleSource.exit)} is not a builtin module, but was loaded as a builtin from ${hrLabel(rawCanonicalName)}. This may be due to an implicit dependency; ensure ${hrLabel(moduleSource.exit)} is explicitly listed as a dependency in ${hrLabel(rawCanonicalName)}'s package.json.`
            )
          }
          return
        }
        if (!rootUsePolicy && rawCanonicalName === ROOT_COMPARTMENT) {
          return
        }

        const canonicalName =
          rawCanonicalName === ROOT_COMPARTMENT && rootUsePolicy
            ? rootUsePolicy
            : rawCanonicalName

        const { language, location: id } = moduleSource

        if (language !== LANGUAGE_MJS && language !== LANGUAGE_CJS) {
          log.debug(
            `Unsupported language "${language}" for module ${id}; skipping`
          )
          return
        }

        totalModuleCount += 1

        const result = inspectionResults.get(/** @type {FileUrlString} */ (id))
        if (result) {
          applyInspectionResults(
            canonicalName,
            result,
            globalsForPackage,
            builtinsForPackage,
            violationsForPackage
          )
        }
      },
      ...options,
    })

    for (const warning of warnings) {
      log.warning(warning)
    }

    log.info(
      `${chalk.greenBright('✓')} ${chalk.bold('Completed inspection')} ${chalk.white('for')} ${chalk.whiteBright(totalModuleCount)} ${pluralize(totalModuleCount, 'module')}`
    )

    const policy = compilePolicy(
      globalsForPackage,
      builtinsForPackage,
      packagePoliciesMap,
      policyOverride,
      rootUsePolicy
    )
    return { policy, packageJsonMap }
  } finally {
    await workerParser.terminate()

    if (policyOverride) {
      reportInvalidCanonicalNames(unknownCanonicalNames, knownCanonicalNames, {
        policy: policyOverride,
        log,
        what: 'policy overrides',
      })
    }

    if (violationsForPackage.size > 0) {
      reportSesViolations(violationsForPackage, { log })
    }
  }
}

/**
 * @param {CanonicalName} canonicalName
 * @param {ModuleInspectionResult} result
 * @param {Map<CanonicalName, GlobalPolicy>} globalsForPackage
 * @param {Map<CanonicalName, BuiltinPolicy>} builtinsForPackage
 * @param {Map<CanonicalName, StructuredViolationsResult>} violationsForPackage
 */
const applyInspectionResults = (
  canonicalName,
  { globalPolicy, builtinPolicy, violations },
  globalsForPackage,
  builtinsForPackage,
  violationsForPackage
) => {
  if (globalPolicy) {
    const current = globalsForPackage.get(canonicalName)
    globalsForPackage.set(canonicalName, { ...current, ...globalPolicy })
  }

  if (builtinPolicy) {
    const current = builtinsForPackage.get(canonicalName)
    builtinsForPackage.set(canonicalName, { ...current, ...builtinPolicy })
  }

  if (violations) {
    const current = violationsForPackage.get(canonicalName)
    if (current) {
      violationsForPackage.set(canonicalName, {
        primordialMutations: [
          ...current.primordialMutations,
          ...violations.primordialMutations,
        ],
        strictModeViolations: [
          ...current.strictModeViolations,
          ...violations.strictModeViolations,
        ],
        dynamicRequires: [
          ...current.dynamicRequires,
          ...violations.dynamicRequires,
        ],
      })
    } else {
      violationsForPackage.set(canonicalName, violations)
    }
  }
}

/**
 * @param {Map<CanonicalName, GlobalPolicy>} globalsForPackage
 * @param {Map<CanonicalName, BuiltinPolicy>} builtinsForPackage
 * @param {Map<CanonicalName, PackagePolicy>} packagesForPackage
 * @param {LavaMoatPolicy} [policyOverride]
 * @param {CanonicalName | undefined} [rootUsePolicy]
 * @returns {MergedLavaMoatPolicy}
 */
const compilePolicy = (
  globalsForPackage,
  builtinsForPackage,
  packagesForPackage,
  policyOverride,
  rootUsePolicy
) => {
  /** @type {LavaMoatPolicy} */
  const policy = { resources: {} }

  /**
   * @param {'builtin' | 'globals'} policyKey
   * @param {Map<CanonicalName, BuiltinPolicy>
   *   | Map<CanonicalName, GlobalPolicy>} policyForPackage
   */
  const mergeReducedPolicyIntoResources = (policyKey, policyForPackage) => {
    for (const [canonicalName, packagePolicy] of policyForPackage) {
      const reducedKeys = tofuUtils.reduceToTopmostApiCallsFromStrings(
        keys(packagePolicy)
      )
      /** @type {BuiltinPolicy | GlobalPolicy} */
      const reducedPolicy = {}
      for (const key of reducedKeys) {
        reducedPolicy[key] =
          packagePolicy[key] === 'read' ? true : packagePolicy[key]
      }
      policy.resources[canonicalName] = {
        ...policy.resources[canonicalName],
        [policyKey]: reducedPolicy,
      }
    }
  }

  mergeReducedPolicyIntoResources('globals', globalsForPackage)
  mergeReducedPolicyIntoResources('builtin', builtinsForPackage)

  for (const [canonicalName, packagePolicy] of packagesForPackage) {
    policy.resources[canonicalName] = {
      ...policy.resources[canonicalName],
      packages: packagePolicy,
    }
  }

  if (rootUsePolicy) {
    policy.root = {
      usePolicy: rootUsePolicy,
    }
  }

  return mergePolicies(policy, policyOverride)
}
