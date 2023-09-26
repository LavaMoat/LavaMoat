const {
  ENDO_ROOT_POLICY,
  ENDO_WILDCARD_POLICY,
  ENDO_WRITE_POLICY,
  LAVAMOAT_PKG_POLICY_ROOT,
  RSRC_POLICY_BUILTINS,
  RSRC_POLICY_GLOBALS,
  RSRC_POLICY_PKGS,
} = require('./constants')

const { isArray } = Array
const { entries, fromEntries } = Object

/**
 * @typedef {typeof ENDO_ROOT_POLICY} RootPolicy
 * @typedef {typeof ENDO_WRITE_POLICY} WritePolicy
 */

/**
 * @typedef {import('@endo/compartment-mapper').Policy<RootPolicy>} LavaMoatEndoPolicy
 */

const DEFAULT_ATTENUATOR = '@lavamoat/endomoat/attenuator/default'

/**
 * Converts LavaMoat `ResourcePolicy.builtins` to Endo's `PackagePolicy.builtins`
 * @param {Record<string, boolean>} item - A value in `ResourcePolicy`
 * @returns {NonNullable<import('@endo/compartment-mapper').PackagePolicy['builtins']>}
 */
function toEndoRsrcPkgsPolicyBuiltins(item) {
  /** @type {NonNullable<import('@endo/compartment-mapper').PackagePolicy['builtins']>} */
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
 * @param {Record<string, boolean>} item - A value in `ResourcePolicy`
 */
function toEndoRsrcPkgsPolicyPkgs(item) {
  /** @type {NonNullable<import('@endo/compartment-mapper').PackagePolicy['packages']>} */
  const policyItem = {}
  for (const [key, value] of entries(item)) {
    if (key === LAVAMOAT_PKG_POLICY_ROOT) {
      // unsure what to do here
    } else {
      policyItem[key] = value
    }
  }
  return policyItem
}

/**
 * Converts LavaMoat `ResourcePolicy.globals` to Endo's `PackagePolicy.globals`
 * @param {Record<string, boolean>} item - A value in `ResourcePolicy`
 * @returns {NonNullable<import('@endo/compartment-mapper').PackagePolicy['globals']>}
 */
function toEndoRsrcPkgsPolicyGlobals(item) {
  return { ...item }
}

/**
 * Converters LavaMoat `ResourcePolicy` to Endo's `PackagePolicy`
 * @param {import('lavamoat-core/schema').ResourcePolicy} resources
 * @returns {import('@endo/compartment-mapper').PackagePolicy<RootPolicy>}1
 */
function toEndoRsrcPkgsPolicy(resources) {
  /** @type {import('@endo/compartment-mapper').PackagePolicy<RootPolicy>['packages']} */
  let packages
  /** @type {import('@endo/compartment-mapper').PackagePolicy<RootPolicy>['globals']} */
  let globals
  /** @type {import('@endo/compartment-mapper').PackagePolicy<RootPolicy>['builtins']} */
  let builtins

  if (resources.packages) {
    packages = toEndoRsrcPkgsPolicyPkgs(resources.packages)
  }

  if (resources.globals) {
    globals = toEndoRsrcPkgsPolicyGlobals(resources.globals)
  }

  if (resources.builtins) {
    builtins = toEndoRsrcPkgsPolicyBuiltins(resources.builtins)
  }

  return { packages, globals, builtins }
}

/**
 * Converts a LavaMoat policy to an Endo policy
 * @param {import('lavamoat-core/schema').LavaMoatPolicySchema} lmPolicy
 * @returns {LavaMoatEndoPolicy}
 */
function toEndoPolicy(lmPolicy) {
  /**
   * Note this is incomplete; the `resources` field is not yet converted
   * @type {LavaMoatEndoPolicy}
   */
  const endoPolicy = {
    defaultAttenuator: DEFAULT_ATTENUATOR,
    entry: {
      [RSRC_POLICY_GLOBALS]: [ENDO_ROOT_POLICY],
      [RSRC_POLICY_PKGS]: ENDO_WILDCARD_POLICY,
      [RSRC_POLICY_BUILTINS]: ENDO_WILDCARD_POLICY,
      noGlobalFreeze: true,
    },
    resources: {},
  }

  if (lmPolicy.resources) {
    endoPolicy.resources = fromEntries(
      entries(lmPolicy.resources).map(([rsrcName, rsrcPolicy]) => [
        rsrcName,
        toEndoRsrcPkgsPolicy(rsrcPolicy),
      ])
    )
  }
  return endoPolicy
}

exports.toEndoPolicy = toEndoPolicy

exports.ROOT_POLICY = ENDO_ROOT_POLICY
exports.WRITE_POLICY = ENDO_WRITE_POLICY
exports.ANY_POLICY = ENDO_WILDCARD_POLICY
