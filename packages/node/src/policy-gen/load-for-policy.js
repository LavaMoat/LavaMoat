/**
 * Provides {@link loadAndGeneratePolicy}, which returns a compartment map
 * descriptor for a given entrypoint.
 *
 * @packageDocumentation
 * @internal
 */

import { captureFromMap } from '@endo/compartment-mapper/capture-lite.js'
import { utils as tofuUtils } from 'lavamoat-tofu'
import { compactPolicyOverride } from 'lavamoat-core'
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
import { action, hrCode, hrLabel, hrPath, seconds, success } from '../format.js'
import { log as defaultLog, LogLevels } from '../log.js'
import { wrapMerged } from '../policy-util.js'
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
 *   ModuleSourceHook,
 *   PackageCompartmentMapDescriptor,
 *   PackageConnectionsHook
 * } from '@endo/compartment-mapper'
 * @import {
 *   BuiltinPolicy,
 *   GlobalPolicy,
 *   LavaMoatPolicy,
 *   PackagePolicy
 * } from '@lavamoat/types'
 * @import {Logger} from '@lavamoat/vog/log.js'
 * @import {PackageJson} from 'type-fest'
 * @import {
 *   ConsumerMapNodeModulesOptions,
 *   LoadAndGeneratePolicyOptions,
 *   LoadAndGeneratePolicyResult,
 *   ModuleInspectionResult,
 *   StructuredViolationsResult
 * } from '../internal.js'
 * @import {
 *   CanonicalName,
 *   FileUrlString
 * } from '../types.js'
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
   * @type {Map<CanonicalName, Set<CanonicalName>>}
   */
  const seededPackagesByCanonicalName = new Map()

  /**
   * Forwarded subset of `mapNodeModules` options. When a `policyOverride` is
   * provided we install a `packageDependenciesHook` that seeds the override's
   * declared package dependencies into the dependency graph, and records what
   * was newly added in {@link seededPackagesByCanonicalName}.
   *
   * @type {ConsumerMapNodeModulesOptions}
   */
  const mapNodeModulesOptions = policyOverride
    ? {
        packageDependenciesHook: ({ canonicalName, dependencies }) => {
          const overridePackages =
            policyOverride.resources[canonicalName]?.packages
          if (overridePackages) {
            for (const dep of keys(overridePackages)) {
              if (!dependencies.has(dep)) {
                const seeded =
                  seededPackagesByCanonicalName.get(canonicalName) ??
                  /** @type {Set<CanonicalName>} */ (new Set())
                seeded.add(dep)
                seededPackagesByCanonicalName.set(canonicalName, seeded)
                dependencies.add(dep)
              }
            }
          }
          return { dependencies }
        },
      }
    : {}

  /** @type {Map<CanonicalName, PackageJson>} */
  let packageJsonMap
  /** @type {PackageCompartmentMapDescriptor} */
  let packageCompartmentMap
  /** @type {Set<CanonicalName>} */
  let unknownCanonicalNames
  /** @type {Set<CanonicalName>} */
  let knownCanonicalNames
  /** @type {CanonicalName | undefined} */
  let rootUsePolicy

  try {
    ;({
      packageJsonMap,
      packageCompartmentMap,
      knownCanonicalNames,
      unknownCanonicalNames,
      rootUsePolicy,
    } = await makeNodeCompartmentMap(entrypointPath, {
      readPowers,
      prodOnly,
      log,
      trustRoot,
      mapNodeModulesOptions,
    }))
  } catch (err) {
    throw new GenerationError(
      `Failed to crawl packages for ${hrPath(entrypointPath)}: ${err}`,
      { cause: err }
    )
  }

  /* c8 ignore next */
  if (!trustRoot && !rootUsePolicy) {
    throw new GenerationError(
      `Root compartment is not trusted, but could not determine the resource to be used as the entry policy`
    )
  }

  const duration = (Date.now() - startTime) / 1000
  const { size: totalPackageCount } = packageJsonMap

  log.info(
    `${success} Found ${hrCode(`${totalPackageCount}`)} ${pluralize(totalPackageCount, 'package')} in ${seconds(duration)}s`
  )

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
   * Deferred warnings to be reported after inspection is complete.
   *
   * Populated by {@link moduleSourceHook}
   *
   * @type {string[]}
   */
  const moduleSourceHookWarnings = []

  const reporter = createModuleInspectionProgressReporter({
    log,
    disabled: log.level > LogLevels.info,
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
      `Failed to inspect modules for ${entrypointPath}: ${err}`,
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
  const mergedPolicy = mergePolicies(unmergedPolicy, policyOverride)
  /**
   * This is the final generated policy
   */
  const policy = wrapMerged(mergedPolicy)

  // #region emit warnings

  // printing of these warnings is deferred until after inspection is complete
  for (const moduleSourceHookWarning of moduleSourceHookWarnings) {
    log.warn(moduleSourceHookWarning)
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
  const compactedPolicyOverride = compactedPolicy ? compactedPolicy : undefined

  if (!compact && compacted) {
    log.info(
      `❕ Policy override contains redundant entries and may be compacted; try running again with --compact`
    )
  }
  // #endregion

  return {
    policy,
    packageJsonMap,
    hasWarnings,
    compactedPolicyOverride,
  }
}

/**
 * Called by the {@link module source hook | createModuleSourceHook} to apply
 * inspection results to the globals map, builtins map, and violations map.
 *
 * @param {CanonicalName} canonicalName
 * @param {ModuleInspectionResult} result
 * @param {Map<CanonicalName, GlobalPolicy>} globalsForPackage
 * @param {Map<CanonicalName, BuiltinPolicy>} builtinsForPackage
 * @param {Map<CanonicalName, StructuredViolationsResult>} violationsForPackage
 * @returns {void}
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
 * Connections passed to this hook by the compartment mapper include any
 * dependencies injected by `packageDependenciesHook` in
 * `makeNodeCompartmentMap` (which seeds
 * `policyOverride.resources[name].packages` into the dependency set so the
 * crawler visits them). To keep `packagePoliciesMap` semantically accurate —
 * "packages discovered by static analysis" — we skip any connection that was
 * _newly_ added by that hook (as recorded in
 * {@link seededPackagesByCanonicalName}). Connections that were both statically
 * discovered _and_ listed in the override are NOT in the seeded set, so they
 * remain in the base policy and `compactPolicyOverride` can correctly identify
 * the corresponding override entry as redundant.
 *
 * @param {Object} params
 * @param {CanonicalName | undefined} params.rootUsePolicy
 * @param {Map<CanonicalName, PackagePolicy>} params.packagePoliciesMap
 * @param {Map<CanonicalName, Set<CanonicalName>>} params.seededPackagesByCanonicalName
 * @returns {PackageConnectionsHook}
 */
const createPackageConnectionsHook =
  ({ rootUsePolicy, packagePoliciesMap, seededPackagesByCanonicalName }) =>
  ({ canonicalName: rawCanonicalName, connections }) => {
    if (!rootUsePolicy && rawCanonicalName === ROOT_COMPARTMENT) {
      return
    }
    const canonicalName =
      rawCanonicalName === ROOT_COMPARTMENT && rootUsePolicy
        ? rootUsePolicy
        : rawCanonicalName
    const seededPackages = seededPackagesByCanonicalName.get(canonicalName)
    const packagePolicy = packagePoliciesMap.get(canonicalName) ?? {}
    for (const connection of connections) {
      if (connection === canonicalName) {
        continue
      }
      if (seededPackages?.has(connection)) {
        continue
      }
      packagePolicy[connection] = true
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
 * @param {Logger} params.log
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
