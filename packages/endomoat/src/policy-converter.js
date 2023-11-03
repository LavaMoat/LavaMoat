import {
  ENDO_ROOT_POLICY,
  ENDO_WILDCARD_POLICY,
  LAVAMOAT_PKG_POLICY_ROOT,
  RSRC_POLICY_BUILTINS,
  RSRC_POLICY_GLOBALS,
  RSRC_POLICY_PKGS,
} from './constants.js'

const { isArray } = Array
const { entries, fromEntries } = Object

/**
 * @typedef {typeof ENDO_ROOT_POLICY} RootPolicy
 * @typedef {typeof import('./constants.js').ENDO_WRITE_POLICY} WritePolicy
 */

/**
 * Extends Endo's `PolicyItem` with the special {@link RootPolicy} and {@link WritePolicy}
 * @typedef {RootPolicy | WritePolicy} LavaMoatGlobalPolicyItem
 */

/**
 * Extends Endo's `PolicyItem` with the special {@link RootPolicy}
 * @typedef {RootPolicy} LavaMoatPackagePolicyItem
 */

/**
 * An Endo policy tailored to LavaMoat's default attenuator
 * @typedef {import('@endo/compartment-mapper').Policy<LavaMoatPackagePolicyItem, LavaMoatGlobalPolicyItem>} LavaMoatEndoPolicy
 */

/**
 * Package policy based on {@link LavaMoatPackagePolicyItem} and {@link LavaMoatGlobalPolicyItem}.
 *
 * Member of {@link LavaMoatEndoPolicy}
 * @typedef {import('@endo/compartment-mapper').PackagePolicy<LavaMoatPackagePolicyItem, LavaMoatGlobalPolicyItem>} LavaMoatPackagePolicy
 */

const DEFAULT_ATTENUATOR = '@lavamoat/endomoat/attenuator'

/**
 * Converts LavaMoat `ResourcePolicy.builtins` to Endo's `PackagePolicy.builtins`
 * @param {Record<string, boolean>} [item] - A value in `ResourcePolicy`
 * @returns {LavaMoatPackagePolicy['builtins']}
 */
function toEndoRsrcPkgsPolicyBuiltins(item) {
  if (!item) {
    return undefined
  }
  /** @type {NonNullable<LavaMoatPackagePolicy['builtins']>} */
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
 * Converts LavaMoat `ResourcePolicy.packages` to Endo's `PackagePolicy.packages`
 * @param {Record<string, boolean>} [item] - A value in `ResourcePolicy`
 * @returns {LavaMoatPackagePolicy['packages']}
 */
function toEndoRsrcPkgsPolicyPkgs(item) {
  if (!item) {
    return undefined
  }
  /** @type {NonNullable<LavaMoatPackagePolicy['packages']>} */
  const policyItem = {}
  for (const [key, value] of entries(item)) {
    if (key === LAVAMOAT_PKG_POLICY_ROOT) {
      throw new TypeError('Unexpected root package policy')
    } else {
      policyItem[key] = value
    }
  }
  return policyItem
}

/**
 * Converts LavaMoat `ResourcePolicy.globals` to Endo's `PackagePolicy.globals`
 * @param {Record<string, boolean>} [item] - A value in `ResourcePolicy`
 * @returns {LavaMoatPackagePolicy['globals']}
 */
function toEndoRsrcPkgsPolicyGlobals(item) {
  if (!item) {
    return undefined
  }
  return { ...item }
}

/**
 * Converters LavaMoat `ResourcePolicy` to Endo's `PackagePolicy`
 * @param {import('lavamoat-core').ResourcePolicy} resources
 * @returns {LavaMoatPackagePolicy}
 */
function toEndoRsrcPkgsPolicy(resources) {
  /** @type {LavaMoatPackagePolicy} */
  const pkgPolicy = {
    packages: toEndoRsrcPkgsPolicyPkgs(resources.packages),
    globals: toEndoRsrcPkgsPolicyGlobals(resources.globals),
    builtins: toEndoRsrcPkgsPolicyBuiltins(resources.builtin),
  }
  return pkgPolicy
}

/**
 * Converts a LavaMoat policy to an Endo policy
 * @param {import('lavamoat-core').LavaMoatPolicy} lmPolicy
 * @returns {LavaMoatEndoPolicy}
 */
export function toEndoPolicy(lmPolicy) {
  /** @type {LavaMoatEndoPolicy} */
  const endoPolicy = {
    //TODO: generate a policy resource for the default attenuator
    defaultAttenuator: DEFAULT_ATTENUATOR,
    entry: {
      [RSRC_POLICY_GLOBALS]: [ENDO_ROOT_POLICY],
      [RSRC_POLICY_PKGS]: ENDO_WILDCARD_POLICY,
      [RSRC_POLICY_BUILTINS]: ENDO_WILDCARD_POLICY,
      noGlobalFreeze: true,
    },
    resources: fromEntries(
      entries(lmPolicy.resources ?? {}).map(([rsrcName, rsrcPolicy]) => [
        rsrcName,
        toEndoRsrcPkgsPolicy(rsrcPolicy),
      ])
    ),
  }
  // add this to make endo allow the attenuator at all, TODO: generate this from the policy or build into Endo
  endoPolicy.resources['@lavamoat/endomoat'] = {
    [RSRC_POLICY_PKGS]: ENDO_WILDCARD_POLICY,
    [RSRC_POLICY_GLOBALS]: ENDO_WILDCARD_POLICY,
    [RSRC_POLICY_BUILTINS]: ENDO_WILDCARD_POLICY,
  }

  return endoPolicy
}
