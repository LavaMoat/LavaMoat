/**
 * Provides hooks for policy generation.
 *
 * @packageDocumentation
 */

import {
  ALL_BUILTIN_MODULES,
  INSPECTABLE_LANGUAGES,
  ROOT_COMPARTMENT,
} from '../constants.js'
import { hrLabel, hrCode } from '../format.js'
import { log as defaultLog } from '../log.js'
import { isOptionalDependency, noop } from '../util.js'

/**
 * @import {
 *   CanonicalName,
 *   FileUrlString,
 *   ModuleSourceHook,
 *   PackageConnectionsHook,
 *   PackageDependenciesHook
 * } from "@endo/compartment-mapper"
 * @import {
 *   BuiltinPolicy,
 *   GlobalPolicy,
 *   LavaMoatPolicy,
 *   PackagePolicy
 * } from "@lavamoat/types"
 * @import {PackageJson} from "type-fest"
 * @import {
 *   ModuleInspectionResult,
 *   StructuredViolationsResult
 * } from "../internal.js"
 * @import {Loggerr} from "../log.js"
 */

const { keys } = Object

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
 * @param {Loggerr} [params.log]
 * @returns {PackageConnectionsHook}
 */
export const createPackageConnectionsHook =
  ({
    rootUsePolicy,
    packagePoliciesMap,
    seededPackagesByCanonicalName,
    log = defaultLog,
  }) =>
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
      log.debug(`Adding connection: ${connection} to ${canonicalName}`)
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
 * @param {Loggerr} [params.log]
 * @param {CanonicalName | undefined} params.rootUsePolicy
 * @param {Map<FileUrlString, ModuleInspectionResult>} params.inspectionResults
 * @param {Map<CanonicalName, GlobalPolicy>} params.globalsForPackage
 * @param {Map<CanonicalName, BuiltinPolicy>} params.builtinsForPackage
 * @param {Map<CanonicalName, StructuredViolationsResult>} params.violationsForPackage
 * @returns {ModuleSourceHook}
 */
export const createModuleSourceHook =
  ({
    packageJsonMap,
    warnings,
    log = defaultLog,
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

/**
 * Creates a {@link PackageDependenciesHook} which seeds the override's declared
 * package dependencies into the dependency graph.
 *
 * This is used by {@link mapNodeModules}.
 *
 * @param {Object} params
 * @param {CanonicalName | undefined} [params.rootUsePolicy] The resource to use
 *   as the policy root
 * @param {LavaMoatPolicy} [params.policyOverride]
 * @param {Map<CanonicalName, Set<CanonicalName>>} params.seededPackagesByCanonicalName
 * @param {Loggerr} [params.log]
 * @returns {PackageDependenciesHook}
 */
export const createPackageDependenciesHook = ({
  rootUsePolicy,
  policyOverride,
  seededPackagesByCanonicalName,
  log = defaultLog,
}) => {
  if (!policyOverride) {
    log.debug(
      'No policy override provided; package dependencies hook is a no-op'
    )
    return noop
  }
  return ({ canonicalName: rawCanonicalName, dependencies }) => {
    // Rewrite the root compartment's synthetic canonical name to the real
    // package name so we can look it up in `policyOverride.resources`.
    const resourceCanonicalName =
      rawCanonicalName === ROOT_COMPARTMENT && rootUsePolicy
        ? rootUsePolicy
        : rawCanonicalName
    const overridePackagesPolicy =
      policyOverride.resources[resourceCanonicalName]?.packages
    if (overridePackagesPolicy) {
      for (const dep of keys(overridePackagesPolicy)) {
        if (!dependencies.has(dep)) {
          const seeded =
            seededPackagesByCanonicalName.get(resourceCanonicalName) ??
            /** @type {Set<CanonicalName>} */ (new Set())
          seeded.add(dep)
          // Key under the rewritten name so createPackageConnectionsHook
          // (which also rewrites before reading seededPackagesByCanonicalName)
          // finds the right set and doesn't leak seeded deps into the
          // base policy.
          seededPackagesByCanonicalName.set(resourceCanonicalName, seeded)
          dependencies.add(dep)
        }
      }
    }
    return { dependencies }
  }
}

/**
 * Applies inspection results to the global and builtin policy maps and the SES
 * violation map.
 *
 * Used by {@link createModuleSourceHook}.
 *
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
    const currentGlobals = globalsForPackage.get(canonicalName)
    globalsForPackage.set(canonicalName, { ...currentGlobals, ...globalPolicy })
  }

  if (builtinPolicy) {
    const currentBuiltins = builtinsForPackage.get(canonicalName)
    builtinsForPackage.set(canonicalName, {
      ...currentBuiltins,
      ...builtinPolicy,
    })
  }

  if (violations) {
    const currentViolations = violationsForPackage.get(canonicalName)
    if (currentViolations) {
      violationsForPackage.set(canonicalName, {
        primordialMutations: [
          ...currentViolations.primordialMutations,
          ...violations.primordialMutations,
        ],
        strictModeViolations: [
          ...currentViolations.strictModeViolations,
          ...violations.strictModeViolations,
        ],
        dynamicRequires: [
          ...currentViolations.dynamicRequires,
          ...violations.dynamicRequires,
        ],
      })
    } else {
      violationsForPackage.set(canonicalName, violations)
    }
  }
}
