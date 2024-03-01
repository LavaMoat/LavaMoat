import {
  LAVAMOAT_PKG_POLICY_ROOT,
  POLICY_ITEM_ROOT,
  POLICY_ITEM_WILDCARD,
  RSRC_POLICY_BUILTINS,
  RSRC_POLICY_GLOBALS,
  RSRC_POLICY_PKGS,
} from './constants.js'

const { isArray } = Array
const { entries, fromEntries } = Object

const DEFAULT_ATTENUATOR = '@lavamoat/endomoat/attenuator'

/**
 * Converts LavaMoat `ResourcePolicy.builtins` to Endo's
 * `PackagePolicy.builtins`
 *
 * @param {Record<string, boolean>} [item] - A value in `ResourcePolicy`
 * @returns {import('./types.js').LavaMoatPackagePolicy['builtins']}
 */
function toEndoRsrcPkgsPolicyBuiltins(item) {
  if (!item) {
    return undefined
  }
  /**
   * @type {NonNullable<
   *   import('./types.js').LavaMoatPackagePolicy['builtins']
   * >}
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
 * @param {Record<string, boolean>} [item] - A value in `ResourcePolicy`
 * @returns {import('./types.js').LavaMoatPackagePolicy['packages']}
 */
function toEndoRsrcPkgsPolicyPkgs(item) {
  if (!item) {
    return undefined
  }
  /**
   * @type {NonNullable<
   *   import('./types.js').LavaMoatPackagePolicy['packages']
   * >}
   */
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
 *
 * @param {import('lavamoat-core').GlobalPolicy} [item] - A value in
 *   `ResourcePolicy`
 * @returns {import('./types.js').LavaMoatPackagePolicy['globals']}
 */
function toEndoRsrcPkgsPolicyGlobals(item) {
  if (!item) {
    return undefined
  }
  return fromEntries(
    entries(item).map(([key, value]) => {
      switch (typeof value) {
        case 'boolean':
          return [key, value]
        case 'string':
          if (value === 'read') {
            return [key, true]
          }
          // XXX: this is "write", which is currently unsupported
          return [key, true]
        default:
          throw new TypeError(`Unexpected global policy value: ${value}`)
      }
    })
  )
}

/**
 * Converters LavaMoat `ResourcePolicy` to Endo's `PackagePolicy`
 *
 * @param {import('lavamoat-core').ResourcePolicy} resources
 * @returns {import('./types.js').LavaMoatPackagePolicy}
 */
function toEndoRsrcPkgsPolicy(resources) {
  /** @type {import('./types.js').LavaMoatPackagePolicy} */
  const pkgPolicy = {
    packages: toEndoRsrcPkgsPolicyPkgs(resources.packages),
    globals: toEndoRsrcPkgsPolicyGlobals(resources.globals),
    builtins: toEndoRsrcPkgsPolicyBuiltins(resources.builtin),
  }
  return pkgPolicy
}

/**
 * Converts a LavaMoat policy to an Endo policy
 *
 * @param {import('lavamoat-core').LavaMoatPolicy} lmPolicy
 * @returns {import('./types.js').LavaMoatEndoPolicy}
 */
export function toEndoPolicy(lmPolicy) {
  /** @type {import('./types.js').LavaMoatEndoPolicy} */
  const endoPolicy = {
    //TODO: generate a policy resource for the default attenuator
    defaultAttenuator: DEFAULT_ATTENUATOR,
    entry: {
      [RSRC_POLICY_GLOBALS]: [POLICY_ITEM_ROOT],
      [RSRC_POLICY_PKGS]: POLICY_ITEM_WILDCARD,
      [RSRC_POLICY_BUILTINS]: POLICY_ITEM_WILDCARD,
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
    [RSRC_POLICY_PKGS]: POLICY_ITEM_WILDCARD,
    [RSRC_POLICY_GLOBALS]: POLICY_ITEM_WILDCARD,
    [RSRC_POLICY_BUILTINS]: POLICY_ITEM_WILDCARD,
  }

  return endoPolicy
}
