/**
 * Provides {@link toEndoPolicy}, which converts a LavaMoat policy into an Endo
 * policy (compatible with `@lavamoat/node`).
 *
 * Policy _conversion_ is not the same as policy _generation_. Policy generation
 * creates a new LavaMoat `policy.json`; policy conversion transforms this (or
 * any) LavaMoat policy into an Endo policy.
 *
 * Policy conversion always occurs prior to execution of an app.
 *
 * @packageDocumentation
 */

import {
  DEFAULT_ATTENUATOR,
  ENDO_PKG_POLICY_BUILTINS,
  ENDO_PKG_POLICY_GLOBALS,
  ENDO_PKG_POLICY_NO_GLOBAL_FREEZE,
  ENDO_PKG_POLICY_OPTION_NATIVE,
  ENDO_PKG_POLICY_OPTIONS,
  ENDO_PKG_POLICY_PACKAGES,
  ENDO_POLICY_DEFAULT_ATTENUATOR,
  ENDO_POLICY_ENTRY,
  ENDO_POLICY_ITEM_ROOT,
  ENDO_POLICY_ITEM_WILDCARD,
  ENDO_POLICY_RESOURCES,
  LAVAMOAT_PKG_POLICY_NATIVE,
} from './constants.js'
import { ConversionError } from './error.js'
import { unwrapMerged } from './policy-util.js'
import { isArray, isBoolean } from './util.js'

const { create, entries, fromEntries } = Object

/**
 * @import {
 *   GlobalPolicy,
 *   LavaMoatPolicy,
 *   PackagePolicy,
 *   ResourcePolicy
 * } from "@lavamoat/types"
 * @import {
 *   LavaMoatEndoPackagePolicy,
 *   LavaMoatEndoPackagePolicyOptions,
 *   LavaMoatEndoPolicy,
 *   Merged,
 *   Resources
 * } from "./types.js"
 */

/**
 * Boilerplate for Endo policies.
 *
 * @internal
 */
export const ENDO_POLICY_BOILERPLATE = Object.freeze(
  /**
   * @type {const}
   * @satisfies {LavaMoatEndoPolicy}
   */ ({
    [ENDO_POLICY_DEFAULT_ATTENUATOR]: DEFAULT_ATTENUATOR,
    [ENDO_POLICY_ENTRY]: {},
    [ENDO_POLICY_RESOURCES]: {},
  })
)

/**
 * The contents of {@link LavaMoatEndoPolicy.entry} when the entry is trusted
 * (`all`)
 *
 * @internal
 */
export const ENDO_POLICY_ENTRY_TRUSTED = Object.freeze(
  /**
   * @type {const}
   * @satisfies {LavaMoatEndoPolicy['entry']}
   */
  ({
    [ENDO_PKG_POLICY_GLOBALS]: [ENDO_POLICY_ITEM_ROOT],
    [ENDO_PKG_POLICY_PACKAGES]: ENDO_POLICY_ITEM_WILDCARD,
    [ENDO_PKG_POLICY_BUILTINS]: ENDO_POLICY_ITEM_WILDCARD,
    [ENDO_PKG_POLICY_NO_GLOBAL_FREEZE]: true,
  })
)

/**
 * Converts LavaMoat `ResourcePolicy.builtins` to Endo's
 * `PackagePolicy.builtins`
 *
 * @param {Record<string, boolean>} [item] - A value in `ResourcePolicy`
 * @returns {LavaMoatEndoPackagePolicy['builtins']}
 */
const convertToEndoPackagePolicyBuiltins = (item) => {
  if (!item) {
    return undefined
  }
  /**
   * @type {NonNullable<LavaMoatEndoPackagePolicy['builtins']>}
   */
  const policyItem = {}

  /** @type {[string, boolean][]} */
  const dot = []
  /** @type {[string, boolean][]} */
  const noDot = []
  for (const [key, value] of entries(item)) {
    if (key.includes('.')) {
      dot.push([key, value])
    } else {
      noDot.push([key, value])
    }
  }

  for (const [key] of dot) {
    const [builtinName, ...rest] = key.split('.')
    const propName = rest.join('.')
    const itemForBuiltin = policyItem[builtinName]
    if (isBoolean(itemForBuiltin)) {
      throw new ConversionError(
        `Expected a FullAttenuationDefinition; got a boolean for ${key}`
      )
    }
    if (isArray(itemForBuiltin)) {
      throw new ConversionError(
        'Expected a FullAttenuationDefinition; got an array'
      )
    }
    const otherParams = itemForBuiltin?.params ?? []
    policyItem[builtinName] = {
      attenuate: DEFAULT_ATTENUATOR,
      params: [...otherParams, propName],
    }
  }
  for (const [key, value] of noDot) {
    policyItem[key] = value
  }
  return policyItem
}

/**
 * Converts LavaMoat `ResourcePolicy.packages` to Endo's
 * `PackagePolicy.packages`
 *
 * @param {PackagePolicy} [item] - A value in `ResourcePolicy`
 * @returns {LavaMoatEndoPackagePolicy['packages']}
 */
const convertToEndoPackagePolicyPackages = (item) => {
  if (!item) {
    return undefined
  }
  /**
   * @type {NonNullable<LavaMoatEndoPackagePolicy['packages']>}
   */
  const policyItem = {}
  for (const [key, value] of entries(item)) {
    policyItem[key] = !!value
  }
  return policyItem
}

/**
 * Converts LavaMoat `ResourcePolicy.globals` to Endo's `PackagePolicy.globals`
 *
 * By returning an array for a truthy value, we force Endo to use the default
 * attenuator.
 *
 * @param {GlobalPolicy} [item] - A value in `ResourcePolicy`
 * @returns {LavaMoatEndoPackagePolicy['globals']}
 */
const convertToEndoPackagePolicyGlobals = (item) => (!item ? undefined : [item])

/**
 * Converts LavaMoat `ResourcePolicy` to Endo's `PackagePolicyOptions`
 *
 * @param {ResourcePolicy} [resources]
 * @returns {LavaMoatEndoPackagePolicyOptions | undefined}
 */
const convertToEndoPackagePolicyOptions = (resources) => {
  if (!resources) {
    return undefined
  }
  /** @type {LavaMoatEndoPackagePolicyOptions | undefined} */
  let pkgPolicyOptions
  // the "native" prop of a LavaMoat package policy corresponds to the "native"
  // prop of the "options" prop of an Endo package policy
  if (resources[LAVAMOAT_PKG_POLICY_NATIVE] === true) {
    pkgPolicyOptions = { [ENDO_PKG_POLICY_OPTION_NATIVE]: true }
  }
  return pkgPolicyOptions
}

/**
 * Converts a {@link ResourcePolicy} object to a {@link LavaMoatEndoPackagePolicy}
 * object
 *
 * @param {ResourcePolicy} [resources] Mapping of resource names to policy
 *   values (if any)
 * @returns {LavaMoatEndoPackagePolicy | undefined}
 */
const convertToEndoPackagePolicy = (resources) => {
  if (!resources) {
    return
  }
  const pkgPolicy = create(null)
  if (resources.packages) {
    pkgPolicy[ENDO_PKG_POLICY_PACKAGES] = convertToEndoPackagePolicyPackages(
      resources.packages
    )
  }
  if (resources.globals) {
    pkgPolicy[ENDO_PKG_POLICY_GLOBALS] = convertToEndoPackagePolicyGlobals(
      resources.globals
    )
  }
  if (resources.builtin) {
    pkgPolicy[ENDO_PKG_POLICY_BUILTINS] = convertToEndoPackagePolicyBuiltins(
      resources.builtin
    )
  }
  const pkgPolicyOptions = convertToEndoPackagePolicyOptions(resources)
  if (pkgPolicyOptions) {
    pkgPolicy[ENDO_PKG_POLICY_OPTIONS] = pkgPolicyOptions
  }
  return pkgPolicy
}

/**
 * Converts a merged LavaMoat policy to an Endo policy.
 *
 * Requires an already-merged policy in the {@link Merged} wrapper. Use
 * {@link loadPolicy} to obtain a merged policy.
 *
 * @example
 *
 * ```js
 * import { loadPolicy, policyInput, policySourceFromFile, toEndoPolicy } from '@lavamoat/node'
 *
 * const merged = await loadPolicy(policyInput({ primary: policySourceFromFile(path) }))
 * const endoPolicy = await toEndoPolicy(merged)
 * ```
 *
 * @param {Merged} merged A merged policy wrapper (from {@link loadPolicy} or
 *   {@link wrapMerged})
 * @returns {Promise<LavaMoatEndoPolicy>}
 * @public
 */
export const toEndoPolicy = async (merged) => {
  await Promise.resolve()
  const policy = unwrapMerged(merged)
  return convertToEndoPolicy(policy)
}

/**
 * Converts a validated, merged `LavaMoatPolicy` into a `LavaMoatEndoPolicy`.
 *
 * This is the pure conversion step — it does not load or merge anything.
 *
 * @param {LavaMoatPolicy} policy A merged LavaMoat policy
 * @returns {LavaMoatEndoPolicy}
 * @internal
 */
const convertToEndoPolicy = (policy) => {
  const lavamoatResources = /** @type {Resources} */ (
    policy.resources ?? create(null)
  )

  const rootPolicyRef = policy.root?.usePolicy

  /**
   * Actual conversion starts here.
   *
   * This converts {@link LavaMoatPolicy.resources LavaMoat's resources property}
   * to {@link LavaMoatEndoPolicy.resources Endo's resources property}.
   *
   * @type {LavaMoatEndoPolicy['resources']}
   */
  const resources = fromEntries(
    entries(lavamoatResources).reduce((acc, [resourceName, resourcePolicy]) => {
      const pkgPolicy = convertToEndoPackagePolicy(resourcePolicy)
      if (pkgPolicy) {
        acc.push([resourceName, pkgPolicy])
      }
      return acc
    }, /** @type {[resourceName: string, endoPolicy: LavaMoatEndoPackagePolicy][]} */ ([]))
  )

  /** @type {NonNullable<LavaMoatEndoPolicy['entry']>} */
  let entry
  // if we have a rootPolicyRef, we are going to copy its policy from resources
  // into the `entry` field.
  if (rootPolicyRef) {
    // if the root policy is undefined, then the root requested no resources
    // (which isn't very interesting, but whatever). create an empty resource policy for it
    if (!resources[rootPolicyRef]) {
      resources[rootPolicyRef] = {}
    }
    entry = resources[rootPolicyRef]
    // we have to delete it from the list of resources or the "unknown canonical
    // name" hook will fire for it
    delete resources[rootPolicyRef]
  } else {
    entry = ENDO_POLICY_ENTRY_TRUSTED
  }

  return {
    ...ENDO_POLICY_BOILERPLATE,
    [ENDO_POLICY_RESOURCES]: resources,
    [ENDO_POLICY_ENTRY]: entry,
  }
}
