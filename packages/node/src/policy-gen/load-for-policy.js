/**
 * Provides {@link loadAndGeneratePolicy}, which returns a compartment map
 * descriptor for a given entrypoint.
 *
 * @packageDocumentation
 */

import { captureFromMap } from '@endo/compartment-mapper/capture-lite.js'
import { compactPolicyOverride } from 'lavamoat-core'
import { utils as tofuUtils } from 'lavamoat-tofu'
import { nullImportHook as importHook } from '../compartment/import-hook.js'
import { makeNodeCompartmentMap } from '../compartment/node-compartment-map.js'
import {
  buildAdditionalLocations,
  buildPreloads,
} from '../compartment/includes.js'
import { DEFAULT_ENDO_OPTIONS } from '../compartment/options.js'
import { defaultReadPowers } from '../compartment/power.js'
import { DEFAULT_TRUST_ROOT_COMPARTMENT } from '../constants.js'
import { action, hrCode, hrPath, seconds, success } from '../format.js'
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
import { GenerationError } from '../error.js'

/**
 * @import {
 *   CanonicalName,
 *   PackageCompartmentMapDescriptor,
 *   PackageDependenciesHook,
 *   ReadNowPowers
 * } from '@endo/compartment-mapper'
 * @import {
 *   BuiltinPolicy,
 *   GlobalPolicy,
 *   LavaMoatPolicy,
 *   PackagePolicy
 * } from '@lavamoat/types'
 * @import {PackageJson} from 'type-fest'
 * @import {
 *   ConsumerMapNodeModulesOptions,
 *   LoadAndGeneratePolicyOptions,
 *   LoadAndGeneratePolicyResult,
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
 * @returns {Promise<LoadAndGeneratePolicyResult>}
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
   * For each canonical name, the set of dependency canonical names that the
   * policy-gen-specific {@link packageDependenciesHook} _newly_ added on top of
   * the statically-discovered dependency set (i.e. were _only_ there because
   * `policyOverride` told us to include them).
   *
   * Used by {@link createPackageConnectionsHook} to filter out hook-seeded
   * connections so `packagePoliciesMap` reflects only statically-discovered
   * package dependencies.
   *
   * Should be empty if no `policyOverride` is provided.
   *
   * @type {Map<CanonicalName, Set<CanonicalName>>}
   */
  const seededPackagesByCanonicalName = new Map()

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
    try {
      rootUsePolicy = await findEntryCanonicalName(entrypointPath, {
        readPowers,
      })
    } catch (err) {
      throw new GenerationError(
        `Failed to determine root policy name for ${hrPath(entrypointPath)}`,
        { cause: err }
      )
    }
  }

  /**
   * Forwarded subset of `mapNodeModules` options.
   *
   * When a `policyOverride` is provided we install a
   * {@link PackageDependenciesHook} that seeds the override's declared package
   * dependencies into the dependency graph, and records what was newly added in
   * {@link seededPackagesByCanonicalName}.
   *
   * Likewise, only if overrides are supplied does `include` affect the policy,
   * so we need to convert `include` to
   * {@link MapNodeModulesOptions.additionalLocations}.
   *
   * @type {ConsumerMapNodeModulesOptions}
   */
  const mapNodeModulesOptions = policyOverride
    ? {
        packageDependenciesHook: createPackageDependenciesHook({
          rootUsePolicy,
          policyOverride,
          seededPackagesByCanonicalName,
          log,
        }),
        additionalLocations: buildAdditionalLocations(policyOverride.include, {
          projectRoot,
        }),
      }
    : {}

  /** @type {Map<CanonicalName, PackageJson>} */
  let packageJsonMap
  /** @type {PackageCompartmentMapDescriptor} */
  let packageCompartmentMap
  /** @type {Set<CanonicalName>} */
  let knownCanonicalNames
  /** @type {Set<CanonicalName>} */
  let unknownCanonicalNames
  try {
    // note: unknownCanonicalNames is only meaningfully populated if we already have a policy
    ;({
      packageJsonMap,
      packageCompartmentMap,
      knownCanonicalNames,
      unknownCanonicalNames,
    } = await makeNodeCompartmentMap(entrypointPath, {
      readPowers,
      prodOnly,
      log,
      trustRoot,
      policyOverride,
      mapNodeModulesOptions,
    }))
  } catch (err) {
    throw new GenerationError(
      `Failed to crawl packages for ${hrPath(entrypointPath)}: ${err}`,
      { cause: err }
    )
  }

  const mapNodeModulesDuration = (Date.now() - startTime) / 1000
  const { size: totalPackageCount } = packageJsonMap

  log.info(
    `${success} Found ${hrCode(totalPackageCount)} ${pluralize(totalPackageCount, 'package')} in ${seconds(mapNodeModulesDuration)}s`
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
   * Deferred warnings to be reported after inspection is complete.
   *
   * Populated by {@link moduleSourceHook}
   *
   * @type {string[]}
   */
  const moduleSourceHookWarnings = []

  const reporter = createModuleInspectionProgressReporter({
    log,
    disabled: log.level > Loggerr.INFO,
  })

  const _preload = buildPreloads(
    packageCompartmentMap,
    policyOverride?.include,
    { projectRoot }
  )

  const packageConnectionsHook = createPackageConnectionsHook({
    rootUsePolicy,
    packagePoliciesMap,
    seededPackagesByCanonicalName,
  })

  const moduleSourceHook = createModuleSourceHook({
    packageJsonMap,
    warnings: moduleSourceHookWarnings,
    log,
    rootUsePolicy,
    inspectionResults,
    globalsForPackage,
    builtinsForPackage,
    violationsForPackage,
  })

  try {
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
  } catch (err) {
    throw new GenerationError(
      `Failed to inspect modules for ${hrPath(entrypointPath)}: ${err}`,
      { cause: err }
    )
  } finally {
    reporter.reportModuleInspectionProgressEnd(
      inspectedModules,
      modulesToInspect
    )
  }

  /**
   * This is the policy before overrides are merged into it
   */
  const unmergedPolicy = compilePolicy(
    globalsForPackage,
    builtinsForPackage,
    packagePoliciesMap,
    rootUsePolicy
  )
  /**
   * This is the final generated policy
   */
  const policy = mergePolicies(unmergedPolicy, policyOverride)

  // #region emit warnings

  // printing of these warnings is deferred until after inspection is complete
  for (const moduleSourceHookWarning of moduleSourceHookWarnings) {
    log.warning(moduleSourceHookWarning)
  }

  reportInvalidCanonicalNames(unknownCanonicalNames, knownCanonicalNames, {
    policy: policyOverride,
    log,
    what: 'policy overrides',
  })
  reportSesViolations(violationsForPackage, { log })

  const hasWarnings = !!(
    moduleSourceHookWarnings.length +
    unknownCanonicalNames.size +
    violationsForPackage.size
  )
  // #endregion

  // #region compaction
  /**
   * When compaction is requested and an override was provided, compute the
   * compacted override against the un-merged generated policy so it contains
   * only what the generator missed.
   */
  const { policy: compactedPolicy, compacted = false } = policyOverride
    ? compactPolicyOverride(policyOverride, unmergedPolicy)
    : { policy: undefined }
  const compactedPolicyOverride =
    compactedPolicy && compacted ? compactedPolicy : undefined
  // #endregion

  return {
    policy,
    packageJsonMap,
    hasWarnings,
    compactedPolicyOverride,
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
   * @param {Map<CanonicalName, BuiltinPolicy> | Map<CanonicalName, GlobalPolicy>} policyForPackage
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
 * @param {ReadNowPowers} [options.readPowers]
 * @returns {Promise<CanonicalName | undefined>}
 */
export const findEntryCanonicalName = async (
  entrypointPath,
  { readPowers = defaultReadPowers }
) => {
  const entryPkg = await readEntryPackageDescriptor(readPowers, entrypointPath)
  if (!entryPkg.name) {
    throw new Error(
      `Entry ${hrPath('package.json')} has no ${hrCode('name')} field; cannot determine root policy name`
    )
  }

  return entryPkg.name
}
