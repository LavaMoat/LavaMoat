import { mergePolicy } from 'lavamoat-core'
import {
  DEFAULT_ATTENUATOR,
  DEFAULT_POLICY_OVERRIDE_PATH,
  LAVAMOAT_PKG_POLICY_ROOT,
  LAVAMOAT_RESOURCE_FLAG_NATIVE,
  POLICY_ITEM_ROOT,
  POLICY_ITEM_WILDCARD,
  RSRC_POLICY_BUILTINS,
  RSRC_POLICY_GLOBALS,
  RSRC_POLICY_OPTION_NATIVE,
  RSRC_POLICY_OPTIONS,
  RSRC_POLICY_PKGS,
} from './constants.js'
import {
  assertPolicy,
  assertPolicyOverride,
  readPolicy,
  readPolicyOverride,
} from './policy.js'

const { isArray } = Array
const { create, entries, fromEntries } = Object

/**
 * Boilerplate for Endo policies.
 *
 * @satisfies {LavaMoatEndoPolicy}
 */
const ENDO_POLICY_BOILERPLATE = /** @type {const} */ ({
  defaultAttenuator: DEFAULT_ATTENUATOR,
  entry: {
    [RSRC_POLICY_GLOBALS]: [POLICY_ITEM_ROOT],
    [RSRC_POLICY_PKGS]: POLICY_ITEM_WILDCARD,
    [RSRC_POLICY_BUILTINS]: POLICY_ITEM_WILDCARD,
    noGlobalFreeze: true,
  },
  resources: {},
})

/**
 * @import {GlobalPolicy, PackagePolicy, LavaMoatPolicy, ResourcePolicy, LavaMoatPolicyOverrides} from 'lavamoat-core'
 * @import {LavaMoatPackagePolicy, LavaMoatPackagePolicyOptions, LavaMoatEndoPolicy, ToEndoPolicyOptions} from './types.js'
 */

/**
 * Converts LavaMoat `ResourcePolicy.builtins` to Endo's
 * `PackagePolicy.builtins`
 *
 * @param {Record<string, boolean>} [item] - A value in `ResourcePolicy`
 * @returns {LavaMoatPackagePolicy['builtins']}
 */
const convertEndoPackagePolicyBuiltins = (item) => {
  if (!item) {
    return undefined
  }
  /**
   * @type {NonNullable<LavaMoatPackagePolicy['builtins']>}
   */
  const policyItem = {}

  for (const [key, value] of entries(item)) {
    if (key.includes('.')) {
      let [builtinName, ...rest] = key.split('.')
      let propName = rest.join('.')
      const itemForBuiltin = policyItem[builtinName]
      if (typeof itemForBuiltin === 'boolean') {
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
 * @returns {LavaMoatPackagePolicy['packages']}
 */
const convertEndoPackagePolicyPackages = (item) => {
  if (!item) {
    return undefined
  }
  /**
   * @type {NonNullable<LavaMoatPackagePolicy['packages']>}
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
 * @returns {LavaMoatPackagePolicy['globals']}
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
 * @returns {LavaMoatPackagePolicyOptions | undefined}
 */
const convertEndoPackagePolicyOptions = (resources) => {
  if (!resources) {
    return undefined
  }
  /** @type {LavaMoatPackagePolicyOptions | undefined} */
  let pkgPolicyOptions
  if (resources[LAVAMOAT_RESOURCE_FLAG_NATIVE] === true) {
    pkgPolicyOptions = { [RSRC_POLICY_OPTION_NATIVE]: true }
  }
  return pkgPolicyOptions
}

/**
 * Converters LavaMoat `ResourcePolicy` to Endo's `PackagePolicy`
 *
 * @param {ResourcePolicy} resources
 * @returns {LavaMoatPackagePolicy}
 */
const convertEndoPackagePolicy = (resources) => {
  return {
    [RSRC_POLICY_PKGS]: convertEndoPackagePolicyPackages(resources.packages),
    [RSRC_POLICY_GLOBALS]: convertEndoPackagePolicyGlobals(resources.globals),
    [RSRC_POLICY_BUILTINS]: convertEndoPackagePolicyBuiltins(resources.builtin),
    [RSRC_POLICY_OPTIONS]: convertEndoPackagePolicyOptions(resources),
  }
}

/**
 * Returns policy override from a given path or URL.
 *
 * If no path or URL provided, will return an empty policy override.
 *
 * @param {string | URL} [policyOverridePath] Path to policy override file. If
 *   relative, computed from cwd
 * @returns {Promise<LavaMoatPolicyOverrides>}
 */
const getPolicyOverride = async (policyOverridePath) => {
  await Promise.resolve()
  if (policyOverridePath) {
    const allegedOverride = await readPolicyOverride(policyOverridePath)

    if (allegedOverride) {
      assertPolicyOverride(allegedOverride)
      return allegedOverride
    }
  }
  return {}
}

/**
 * Converts a LavaMoat policy to an Endo policy
 *
 * @overload
 * @param {LavaMoatPolicy} policy LavaMoat policy to convert
 * @param {ToEndoPolicyOptions} [options] Options for conversion
 * @returns {Promise<LavaMoatEndoPolicy>}
 * @public
 */

/**
 * Converts a LavaMoat policy on disk to an Endo policy
 *
 * @overload
 * @param {string | URL} policyPath Path to LavaMoat policy to convert
 * @param {ToEndoPolicyOptions} [options] Options for conversion
 * @returns {Promise<LavaMoatEndoPolicy>}
 * @public
 */

/**
 * Converts a LavaMoat policy to an Endo policy
 *
 * @param {LavaMoatPolicy | string | URL} policyOrPolicyPath LavaMoat policy to
 *   convert
 * @param {ToEndoPolicyOptions} [options] Options for conversion
 * @returns {Promise<LavaMoatEndoPolicy>}
 * @public
 */
export const toEndoPolicy = async (
  policyOrPolicyPath,
  {
    policyOverride,
    policyOverridePath = new URL(DEFAULT_POLICY_OVERRIDE_PATH, import.meta.url),
  } = {}
) => {
  await Promise.resolve()

  // read & validate policy if we have a path
  /** @type {unknown} */
  let allegedPolicy

  /** @type {LavaMoatPolicy} */
  let policy
  if (
    typeof policyOrPolicyPath === 'string' ||
    policyOrPolicyPath instanceof URL
  ) {
    const policyPath = policyOrPolicyPath
    allegedPolicy = await readPolicy(policyPath)
  } else {
    allegedPolicy = policyOrPolicyPath
  }

  assertPolicy(allegedPolicy)
  policy = allegedPolicy

  /**
   * Policy for self; needed for default attenuator.
   *
   * @type {LavaMoatPolicyOverrides}
   */
  const override =
    policyOverride ?? (await getPolicyOverride(policyOverridePath))

  const lavaMoatPolicy = mergePolicy(policy, override)

  /**
   * Actual conversion starts here.
   *
   * This converts {@link LavaMoatPolicy.resources LavaMoat's resources property}
   * to {@link LavaMoatEndoPolicy.resources Endo's resources property}.
   *
   * @type {LavaMoatEndoPolicy['resources']}
   */
  const resources = fromEntries(
    entries(lavaMoatPolicy.resources ?? create(null)).map(
      ([resourceName, resourcePolicy]) => [
        resourceName,
        convertEndoPackagePolicy(resourcePolicy),
      ]
    )
  )

  /** @type {LavaMoatEndoPolicy} */
  const endoPolicy = {
    ...ENDO_POLICY_BOILERPLATE,
    resources,
  }

  return endoPolicy
}
