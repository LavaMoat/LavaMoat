/**
 * Provides {@link loadAndGeneratePolicy}, which returns a compartment map
 * descriptor for a given entrypoint.
 *
 * @packageDocumentation
 * @internal
 */

import { captureFromMap } from '@endo/compartment-mapper/capture-lite.js'
import { findUnknownCanonicalNames } from '@endo/compartment-mapper/policy.js'
import { compactPolicyOverride } from 'lavamoat-core'
import { utils as tofuUtils } from 'lavamoat-tofu'
import { nullImportHook as importHook } from '../compartment/import-hook.js'
import { makeNodeCompartmentMap } from '../compartment/node-compartment-map.js'
import { buildAdditionalLocations } from '../compartment/additional-locations.js'
import { DEFAULT_ENDO_OPTIONS } from '../compartment/options.js'
import { defaultReadPowers } from '../compartment/power.js'
import { DEFAULT_TRUST_ROOT_COMPARTMENT } from '../constants.js'
import { action, hrCode, seconds, success } from '../format.js'
import { log as defaultLog, Loggerr } from '../log.js'
import { mergePolicies } from '../policy-util.js'
import {
  createModuleInspectionProgressReporter,
  reportInvalidCanonicalNames,
  reportSesViolations,
} from '../report.js'
import { pluralize, readEntryPackageDescriptor } from '../util.js'
import { createPolicyGenParsers } from './policy-gen-parsers.js'
import {
  createModuleSourceHook,
  createPackageConnectionsHook,
  createPackageDependenciesHook,
} from './hooks.js'

/**
 * @import {
 *   CanonicalName,
 *   PackageDependenciesHook
 * } from "@endo/compartment-mapper"
 * @import {
 *   BuiltinPolicy,
 *   GlobalPolicy,
 *   LavaMoatPolicy,
 *   PackagePolicy
 * } from "@lavamoat/types"
 * @import {
 *   ConsumerMapNodeModulesOptions,
 *   LoadAndGeneratePolicyOptions,
 *   LoadAndGeneratePolicyResult,
 *   ModuleInspectionResult,
 *   StructuredViolationsResult
 * } from "../internal.js"
 * @import {
 *   FileUrlString,
 *   LavaMoatReadPowers
 * } from "../types.js"
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
 * @returns {Promise<LoadAndGeneratePolicyResult>}
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
    compact,
    projectRoot = process.cwd(),
    ...options
  } = {}
) => {
  const startTime = Date.now()

  log.info(`${action('Crawling')} dependency graph…`)

  /**
   * When the root compartment is not trusted, the entry package's `name` field
   * is used as the canonical name for the root's policy entry (instead of
   * `$root$`). We pre-compute it here — before `mapNodeModules` runs — so that
   * the `packageDependenciesHook` below can correctly look up and seed the
   * root's override-declared package dependencies.
   *
   * @type {CanonicalName | undefined}
   */
  let rootUsePolicy
  if (!trustRoot) {
    rootUsePolicy = await findEntryCanonicalName(entrypointPath, { readPowers })
  }

  /**
   * For each canonical name, the set of dependency canonical names that the
   * policy-gen-specific {@link packageDependenciesHook} _newly_ added on top of
   * the statically-discovered dependency set (i.e. were _only_ there because
   * `policyOverride` told us to include them).
   *
   * Used by {@link createPackageConnectionsHook} to filter out hook-seeded
   * connections so `packagePoliciesMap` reflects only statically-discovered
   * package dependencies.
   *
   * Should be empty of no `policyOverride` is provided.
   *
   * @type {Map<CanonicalName, Set<CanonicalName>>}
   */
  const seededPackagesByCanonicalName = new Map()

  /**
   * Forwarded subset of `mapNodeModules` options.
   *
   * When a `policyOverride` is provided we install a
   * {@link PackageDependenciesHook} that seeds the override's declared package
   * dependencies into the dependency graph, and records what was newly added in
   * {@link seededPackagesByCanonicalName}.
   *
   * @type {ConsumerMapNodeModulesOptions}
   */
  const mapNodeModulesOptions = {
    additionalLocations: buildAdditionalLocations(policyOverride, projectRoot),
    ...(policyOverride
      ? {
          packageDependenciesHook: createPackageDependenciesHook({
            rootUsePolicy,
            policyOverride,
            seededPackagesByCanonicalName,
            log,
          }),
        }
      : {}),
  }

  const { packageJsonMap, packageCompartmentMap, knownCanonicalNames } =
    await makeNodeCompartmentMap(entrypointPath, {
      readPowers,
      prodOnly,
      log,
      mapNodeModulesOptions,
    })

  const duration = (Date.now() - startTime) / 1000
  const { size: totalPackageCount } = packageJsonMap

  log.info(
    `${success} Found ${hrCode(totalPackageCount)} ${pluralize(totalPackageCount, 'package')} in ${seconds(duration)}s`
  )

  /**
   * Mapping of canonical names to global policies.
   *
   * @type {Map<CanonicalName, GlobalPolicy>}
   */
  const globalsForPackage = new Map()

  /**
   * Mapping of canonical names to builtin policies.
   *
   * @type {Map<CanonicalName, BuiltinPolicy>}
   */
  const builtinsForPackage = new Map()

  /**
   * Mapping of canonical names to package policies.
   *
   * @type {Map<CanonicalName, PackagePolicy>}
   */
  const packagePoliciesMap = new Map()

  /**
   * Mapping of canonical names to SES violation results.
   *
   * @type {Map<CanonicalName, StructuredViolationsResult>}
   */
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
    seededPackagesByCanonicalName,
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

  const unmergedPolicy = compilePolicy(
    globalsForPackage,
    builtinsForPackage,
    packagePoliciesMap,
    rootUsePolicy
  )

  /**
   * When compaction is requested and an override was provided, compute the
   * compacted override against the un-merged generated policy so it contains
   * only what the generator missed.
   */
  const { policy: compactedPolicyOverride, compacted = false } = policyOverride
    ? compactPolicyOverride(policyOverride, unmergedPolicy)
    : { policy: undefined }

  const policy = mergePolicies(unmergedPolicy, policyOverride)

  // #region emit warnings
  for (const warning of warnings) {
    log.warning(warning)
  }

  if (policyOverride) {
    if (rootUsePolicy) {
      knownCanonicalNames.add(rootUsePolicy)
    }
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

  if (violationsForPackage.size > 0) {
    reportSesViolations(violationsForPackage, { log })
  }

  const hasWarnings = !!(
    unknownCanonicalNames.size +
    violationsForPackage.size +
    warnings.length
  )
  // #endregion

  if (!compact && compacted) {
    log.info(
      `❕ Policy override contains redundant entries and may be compacted; try running again with --compact`
    )
  }
  return {
    policy,
    packageJsonMap,
    hasWarnings,
    compactedPolicyOverride: compact ? compactedPolicyOverride : undefined,
  }
}

/**
 * Compiles an un-merged policy from the inspection results.
 *
 * The caller is responsible for merging the result with any policy override via
 * {@link mergePolicies}.
 *
 * @param {Map<CanonicalName, GlobalPolicy>} globalsForPackage
 * @param {Map<CanonicalName, BuiltinPolicy>} builtinsForPackage
 * @param {Map<CanonicalName, PackagePolicy>} packagesForPackage
 * @param {CanonicalName | undefined} [rootUsePolicy]
 * @returns {LavaMoatPolicy}
 */
const compilePolicy = (
  globalsForPackage,
  builtinsForPackage,
  packagesForPackage,
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

  return policy
}

/**
 * Finds the name of the package at the given entrypoint.
 *
 * Used to determine the canonical name of the entry compartment.
 *
 * @param {string | URL} entrypointPath
 * @param {Object} options
 * @param {LavaMoatReadPowers} [options.readPowers]
 * @returns {Promise<CanonicalName | undefined>}
 */
export const findEntryCanonicalName = async (
  entrypointPath,
  { readPowers = defaultReadPowers }
) => {
  const entryPkg = await readEntryPackageDescriptor(readPowers, entrypointPath)
  if (!entryPkg.name) {
    throw new Error(
      `Entry ${hrCode('package.json')} has no ${hrCode('name')} field; cannot determine root policy name`
    )
  }

  return entryPkg.name
}
