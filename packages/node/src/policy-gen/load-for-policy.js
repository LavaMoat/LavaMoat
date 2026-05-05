/**
 * Provides {@link loadAndGeneratePolicy}, which returns a compartment map
 * descriptor for a given entrypoint.
 *
 * @packageDocumentation
 * @internal
 */

import { captureFromMap } from '@endo/compartment-mapper/capture-lite.js'
import { findUnknownCanonicalNames } from '@endo/compartment-mapper/policy.js'
import { utils as tofuUtils } from 'lavamoat-tofu'
import { nullImportHook as importHook } from '../compartment/import-hook.js'
import { makeNodeCompartmentMap } from '../compartment/node-compartment-map.js'
import { DEFAULT_ENDO_OPTIONS } from '../compartment/options.js'
import { defaultReadPowers } from '../compartment/power.js'
import {
  ALL_BUILTIN_MODULES,
  DEFAULT_TRUST_ROOT_COMPARTMENT,
  INSPECTABLE_LANGUAGES,
  ROOT_COMPARTMENT,
} from '../constants.js'
import { GenerationError } from '../error.js'
import { action, hrCode, hrLabel, seconds, success } from '../format.js'
import { log as defaultLog, Loggerr } from '../log.js'
import { mergePolicies } from '../policy-util.js'
import {
  createModuleInspectionProgressReporter,
  reportInvalidCanonicalNames,
  reportSesViolations,
} from '../report.js'
import { isOptionalDependency, pluralize } from '../util.js'
import { createPolicyGenParsers } from './policy-gen-parsers.js'

/**
 * @import {
 *   CanonicalName,
 *   ModuleSourceHook,
 *   PackageConnectionsHook
 * } from '@endo/compartment-mapper'
 * @import {
 *   BuiltinPolicy,
 *   GlobalPolicy,
 *   LavaMoatPolicy,
 *   PackagePolicy
 * } from '@lavamoat/types'
 * @import {
 *   PackageJson,
 *   PackageJson
 * } from 'type-fest'
 * @import {
 *   LoadAndGeneratePolicyOptions,
 *   LoadCompartmentMapResult,
 *   ModuleInspectionResult,
 *   StructuredViolationsResult
 * } from '../internal.js'
 * @import {FileUrlString} from '../types.js'
 */

const { keys } = Object

/**
 * Loads the compartment map for a given entrypoint, inspects all modules for
 * globals, builtins, and SES compatibility violations, and compiles a policy.
 *
 * All module parsing and analysis is parallelized across worker threads via the
 * async worker parser. Both ESM and CJS modules go through the worker pool,
 * which runs the full composed pipeline (parse + tofu analysis + evasive
 * transforms + module-source analysis + generate + record building) per
 * module.
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
  const startTime = Date.now()

  log.info(`${action('Crawling')} dependency graph…`)

  const {
    packageJsonMap,
    packageCompartmentMap,
    knownCanonicalNames,
    rootUsePolicy,
  } = await makeNodeCompartmentMap(entrypointPath, {
    readPowers,
    prodOnly,
    log,
    trustRoot,
    policyOverride,
  })

  const duration = (Date.now() - startTime) / 1000
  const { size: totalPackageCount } = packageJsonMap

  log.info(
    `${success} Found ${hrCode(totalPackageCount)} ${pluralize(totalPackageCount, 'package')} in ${seconds(duration)}s`
  )

  /* c8 ignore next */
  if (!trustRoot && !rootUsePolicy) {
    throw new GenerationError(
      `Root compartment is not trusted, but no data for ${hrCode('root.usePolicy')} exists`
    )
  }

  /** @type {Map<CanonicalName, GlobalPolicy>} */
  const globalsForPackage = new Map()

  /** @type {Map<CanonicalName, BuiltinPolicy>} */
  const builtinsForPackage = new Map()

  /**
   * Mapping of canonical names to package policies.
   *
   * @type {Map<CanonicalName, PackagePolicy>}
   */
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

  /**
   * Set of module URLs remaining to be inspected.
   *
   * @type {Set<string>}
   */
  const modulesToInspect = new Set()

  /**
   * Set of module URLs that have been inspected.
   *
   * @type {Set<string>}
   */
  const inspectedModules = new Set()

  /**
   * Set of canonical names that are unknown to the policy.
   *
   * @type {Set<string>}
   */
  let unknownCanonicalNames = new Set()

  /**
   * Deferred warnings to be reported after inspection is complete.
   *
   * Populated by {@link moduleSourceHook}
   *
   * @type {string[]}
   */
  const warnings = []

  const reporter = createModuleInspectionProgressReporter({
    log,
    disabled: log.level > Loggerr.INFO,
  })

  const _preload = policyOverride?.include?.map((include) =>
    typeof include === 'string'
      ? { compartment: include, entry: '.' }
      : { compartment: include.name, entry: include.entry }
  )

  const packageConnectionsHook = createPackageConnectionsHook({
    rootUsePolicy,
    packagePoliciesMap,
  })

  const moduleSourceHook = createModuleSourceHook({
    packageJsonMap,
    warnings,
    log,
    rootUsePolicy,
    inspectionResults,
    globalsForPackage,
    builtinsForPackage,
    violationsForPackage,
  })

  await captureFromMap(readPowers, packageCompartmentMap, {
    ...DEFAULT_ENDO_OPTIONS,
    parserForLanguage: {
      ...DEFAULT_ENDO_OPTIONS.parserForLanguage,
      ...createPolicyGenParsers(inspectionResults, {
        reporter,
        modulesToInspect,
        inspectedModules,
        log,
      }),
    },
    importHook,
    log: log.debug.bind(log),
    _preload,
    packageConnectionsHook,
    moduleSourceHook,
    ...options,
  })
  reporter.reportModuleInspectionProgressEnd(inspectedModules, modulesToInspect)

  const policy = compilePolicy(
    globalsForPackage,
    builtinsForPackage,
    packagePoliciesMap,
    policyOverride,
    rootUsePolicy
  )

  // #region emit warnings
  for (const warning of warnings) {
    log.warning(warning)
  }

  if (policyOverride) {
    unknownCanonicalNames = findUnknownCanonicalNames(
      knownCanonicalNames,
      policyOverride
    )
    reportInvalidCanonicalNames(unknownCanonicalNames, knownCanonicalNames, {
      policy: policyOverride,
      log,
      what: 'policy overrides',
    })
  }

  const hasWarnings =
    unknownCanonicalNames.size > 0 || violationsForPackage.size > 0

  if (violationsForPackage.size > 0) {
    reportSesViolations(violationsForPackage, { log })
  }
  // #endregion
  return { policy, packageJsonMap, hasWarnings }
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
 * Compiles a policy from the inspection results.
 *
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

/**
 * @param {Object} params
 * @param {CanonicalName | undefined} params.rootUsePolicy
 * @param {Map<CanonicalName, PackagePolicy>} params.packagePoliciesMap
 * @returns {PackageConnectionsHook}
 */
const createPackageConnectionsHook =
  ({ rootUsePolicy, packagePoliciesMap }) =>
  ({ canonicalName: rawCanonicalName, connections }) => {
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
  }

/**
 * Creates a {@link ModuleSourceHook} which applies inspection results to the
 * global and builtin policies and adds warnings for implicit dependencies.
 *
 * @param {Object} params
 * @param {Map<CanonicalName, PackageJson>} params.packageJsonMap
 * @param {string[]} params.warnings
 * @param {Loggerr} params.log
 * @param {CanonicalName | undefined} params.rootUsePolicy
 * @param {Map<FileUrlString, ModuleInspectionResult>} params.inspectionResults
 * @param {Map<CanonicalName, GlobalPolicy>} params.globalsForPackage
 * @param {Map<CanonicalName, BuiltinPolicy>} params.builtinsForPackage
 * @param {Map<CanonicalName, StructuredViolationsResult>} params.violationsForPackage
 * @returns {ModuleSourceHook}
 */
const createModuleSourceHook =
  ({
    packageJsonMap,
    warnings,
    log,
    rootUsePolicy,
    inspectionResults,
    globalsForPackage,
    builtinsForPackage,
    violationsForPackage,
  }) =>
  ({ moduleSource, canonicalName: rawCanonicalName }) => {
    if ('exit' in moduleSource) {
      if (
        !ALL_BUILTIN_MODULES.has(moduleSource.exit) &&
        !moduleSource.exit.endsWith('package.json')
      ) {
        const packageJson = packageJsonMap.get(rawCanonicalName)
        // ignore optional dependencies
        if (
          packageJson &&
          isOptionalDependency(packageJson, moduleSource.exit)
        ) {
          return
        }

        if (packageJson && packageJson.dependencies?.[moduleSource.exit]) {
          warnings.push(
            `${hrLabel(moduleSource.exit)} is not a builtin module, but was otherwise not accessible from ${hrLabel(rawCanonicalName)}. Consider adding it to policy overrides.`
          )
        } else {
          warnings.push(
            `${hrLabel(moduleSource.exit)} is not a builtin module, but was otherwise not accessible from ${hrLabel(rawCanonicalName)}. This may be due to an implicit dependency.`
          )
          if (!packageJson) {
            log.debug(
              `${hrLabel(rawCanonicalName)} is apparently missing a ${hrCode('package.json')}.`
            )
          }
        }
      }
      return
    }

    // root compartment has access to everything; no need to generate policy for it
    if (!rootUsePolicy && rawCanonicalName === ROOT_COMPARTMENT) {
      return
    }

    const { language, location } = moduleSource

    if (!INSPECTABLE_LANGUAGES.has(language)) {
      return
    }

    const canonicalName =
      rawCanonicalName === ROOT_COMPARTMENT && rootUsePolicy
        ? rootUsePolicy
        : rawCanonicalName

    const result = inspectionResults.get(location)
    if (result) {
      applyInspectionResults(
        canonicalName,
        result,
        globalsForPackage,
        builtinsForPackage,
        violationsForPackage
      )
    } else {
      log.debug(`No inspection results found for ${hrLabel(location)}`)
    }
  }
