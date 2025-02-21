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

import { mergePolicy } from 'lavamoat-core'
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
  LAVAMOAT_PKG_POLICY_ROOT,
} from './constants.js'
import {
  assertPolicy,
  assertPolicyOverride,
  readPolicy,
  readPolicyOverride,
} from './policy-util.js'
import { hasValue, isArray, isBoolean, isString } from './util.js'

const { create, entries, fromEntries } = Object

/**
 * @import {GlobalPolicy,
 *   PackagePolicy,
 *   LavaMoatPolicy,
 *   ResourcePolicy,
 *   LavaMoatPolicyOverrides} from 'lavamoat-core'
 * @import {LavaMoatEndoPackagePolicy,
 *   LavaMoatEndoPackagePolicyOptions,
 *   LavaMoatEndoPolicy,
 *   ToEndoPolicyOptions,
 * Resources} from './types.js'
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
const convertEndoPackagePolicyBuiltins = (item) => {
  if (!item) {
    return undefined
  }
  /**
   * @type {NonNullable<LavaMoatEndoPackagePolicy['builtins']>}
   */
  const policyItem = {}

  for (const [key, value] of entries(item)) {
    if (key.includes('.')) {
      let [builtinName, ...rest] = key.split('.')
      let propName = rest.join('.')
      const itemForBuiltin = policyItem[builtinName]
      if (isBoolean(itemForBuiltin)) {
        throw new TypeError(
          'Expected a FullAttenuationDefinition; got a boolean'
        )
      }
      if (isArray(itemForBuiltin)) {
        throw new TypeError(
          'Expected a FullAttenuationDefinition; got an array'
        )
      }
      const otherParams = itemForBuiltin?.params ?? []
      policyItem[builtinName] = {
        attenuate: DEFAULT_ATTENUATOR,
        params: [...otherParams, propName],
      }
    } else {
      policyItem[key] = value
    }
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
const convertEndoPackagePolicyPackages = (item) => {
  if (!item) {
    return undefined
  }
  /**
   * @type {NonNullable<LavaMoatEndoPackagePolicy['packages']>}
   */
  const policyItem = {}
  for (const [key, value] of entries(item)) {
    if (key === LAVAMOAT_PKG_POLICY_ROOT) {
      throw new TypeError('Unexpected root package policy')
    } else {
      policyItem[key] = !!value
    }
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
const convertEndoPackagePolicyGlobals = (item) => {
  if (!item) {
    return undefined
  }
  return [item]
}

/**
 * Converts LavaMoat `ResourcePolicy` to Endo's `PackagePolicyOptions`
 *
 * @param {ResourcePolicy} [resources]
 * @returns {LavaMoatEndoPackagePolicyOptions | undefined}
 */
const convertEndoPackagePolicyOptions = (resources) => {
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
 * @param {ResourcePolicy} [resources]
 * @param {boolean} [isRoot]
 * @returns {LavaMoatEndoPackagePolicy | undefined}
 */
const convertEndoPackagePolicy = (resources, isRoot = false) => {
  if (!resources) {
    return isRoot ? {} : undefined
  }
  const pkgPolicy = create(null)
  if (resources.packages) {
    pkgPolicy[ENDO_PKG_POLICY_PACKAGES] = convertEndoPackagePolicyPackages(
      resources.packages
    )
  }
  if (resources.globals) {
    pkgPolicy[ENDO_PKG_POLICY_GLOBALS] = convertEndoPackagePolicyGlobals(
      resources.globals
    )
  }
  if (resources.builtin) {
    pkgPolicy[ENDO_PKG_POLICY_BUILTINS] = convertEndoPackagePolicyBuiltins(
      resources.builtin
    )
  }
  const pkgPolicyOptions = convertEndoPackagePolicyOptions(resources)
  if (pkgPolicyOptions) {
    pkgPolicy[ENDO_PKG_POLICY_OPTIONS] = pkgPolicyOptions
  }
  return pkgPolicy
}

/**
 * Performs actual conversion of LavaMoat policy and optional override to Endo
 * policy
 *
 * @param {LavaMoatPolicy} policy
 * @param {ToEndoPolicyOptions} [options] Options for conversion
 * @returns {LavaMoatEndoPolicy} Endo policy
 */
const convert = (policy, { policyOverride } = {}) => {
  const lavaMoatPolicy = mergePolicy(policy, policyOverride)

  const lavamoatResources = /** @type {Resources} */ (
    lavaMoatPolicy.resources ?? create(null)
  )

  const rootPolicyRef = lavaMoatPolicy.root?.usePolicy

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
      const pkgPolicy = convertEndoPackagePolicy(
        resourcePolicy,
        resourceName === rootPolicyRef
      )
      if (pkgPolicy) {
        return [...acc, [resourceName, pkgPolicy]]
      }
      return acc
    }, /** @type {[resourceName: string, endoPolicy: LavaMoatEndoPackagePolicy][]} */ ([]))
  )

  const entry = rootPolicyRef
    ? resources[rootPolicyRef]
    : ENDO_POLICY_ENTRY_TRUSTED

  /** @type {LavaMoatEndoPolicy} */
  const endoPolicy = {
    ...ENDO_POLICY_BOILERPLATE,
    [ENDO_POLICY_RESOURCES]: resources,
    [ENDO_POLICY_ENTRY]: entry,
  }

  return endoPolicy
}

/**
 * Converts a LavaMoat policy to an Endo policy.
 *
 * Use if you've already read the policy and/or policy override from disk.
 *
 * @param {LavaMoatPolicy} policy
 * @param {LavaMoatPolicyOverrides} [policyOverride]
 * @returns {LavaMoatEndoPolicy} Endo Policy
 * @public
 */
export const toEndoPolicySync = (policy, policyOverride) => {
  assertPolicy(policy)
  if (policyOverride) {
    assertPolicyOverride(policyOverride)
  }
  return convert(policy, { policyOverride })
}

/**
 * Converts a LavaMoat policy to an Endo policy.
 *
 * Takes policy overrides into account, if provided.
 *
 * Performs validation of policy and policy overrides.
 *
 * @overload
 * @param {LavaMoatPolicy} policy LavaMoat policy to convert
 * @param {ToEndoPolicyOptions} [options] Options for conversion
 * @returns {Promise<LavaMoatEndoPolicy>}
 * @public
 * @see {@link toEndoPolicySync}
 */

/**
 * Given a path to a policy, converts a LavaMoat policy to an Endo policy.
 *
 * Takes policy overrides into account, if provided.
 *
 * Performs validation of policy and policy overrides.
 *
 * @overload
 * @param {string | URL} policyPath Path or URL to policy file)
 * @param {ToEndoPolicyOptions} [options] Options for conversion
 * @returns {Promise<LavaMoatEndoPolicy>}
 * @public
 */

/**
 * Converts a LavaMoat policy to an Endo policy.
 *
 * Takes policy overrides into account, if provided.
 *
 * Performs validation of policy and policy overrides.
 *
 * @privateRemarks
 * The overloads aren't strictly necessary, but they're a little nicer to
 * understand for consumers.
 * @param {LavaMoatPolicy | string | URL} policyOrPolicyPath LavaMoat policy to
 *   convert (or path to policy file)
 * @param {ToEndoPolicyOptions} [options] Options for conversion
 * @returns {Promise<LavaMoatEndoPolicy>}
 * @public
 */
export const toEndoPolicy = async (policyOrPolicyPath, options = {}) => {
  await Promise.resolve()

  if (!policyOrPolicyPath) {
    throw new TypeError('Expected a policy or policy path')
  }

  /** @type {LavaMoatPolicy} */
  let policy
  if (isString(policyOrPolicyPath) || policyOrPolicyPath instanceof URL) {
    const policyPath = policyOrPolicyPath
    policy = await readPolicy(policyPath)
  } else {
    const allegedPolicy = policyOrPolicyPath
    assertPolicy(allegedPolicy)
    policy = allegedPolicy
  }

  /** @type {LavaMoatPolicyOverrides | undefined} */
  let policyOverride
  if (hasValue(options, 'policyOverridePath')) {
    policyOverride = await readPolicyOverride(options.policyOverridePath)
  } else if (hasValue(options, 'policyOverride')) {
    const allegedPolicyOverride = options.policyOverride
    assertPolicyOverride(allegedPolicyOverride)
    policyOverride = allegedPolicyOverride
  }

  return convert(policy, {
    policyOverride,
  })
}
