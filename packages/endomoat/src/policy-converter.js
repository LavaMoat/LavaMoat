import { mergePolicy } from 'lavamoat-core'
import {
  LAVAMOAT_PKG_POLICY_ROOT,
  LAVAMOAT_PKG_POLICY_VALUE_DYNAMIC,
  POLICY_ITEM_DYNAMIC,
  POLICY_ITEM_ROOT,
  POLICY_ITEM_WILDCARD,
  RSRC_POLICY_BUILTINS,
  RSRC_POLICY_GLOBALS,
  RSRC_POLICY_OPTIONS,
  RSRC_POLICY_PKGS,
} from './constants.js'
import { readPolicy } from './policy.js'

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
      if (itemForBuiltin === 'dynamic') {
        throw new TypeError(
          'Expected a FullAttenuationDefinition; got "dynamic"'
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
 * @param {import('lavamoat-core').PackagePolicy} [item] - A value in
 *   `ResourcePolicy`
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
      policyItem[key] =
        value === LAVAMOAT_PKG_POLICY_VALUE_DYNAMIC
          ? POLICY_ITEM_DYNAMIC
          : Boolean(value)
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
    [RSRC_POLICY_PKGS]: toEndoRsrcPkgsPolicyPkgs(resources.packages),
    [RSRC_POLICY_GLOBALS]: toEndoRsrcPkgsPolicyGlobals(resources.globals),
    [RSRC_POLICY_BUILTINS]: toEndoRsrcPkgsPolicyBuiltins(resources.builtin),
    [RSRC_POLICY_OPTIONS]: resources.native === true ? { native: true } : {},
  }
  return pkgPolicy
}

/**
 * Converts a LavaMoat policy to an Endo policy
 *
 * @param {import('lavamoat-core').LavaMoatPolicy} lmPolicy
 * @returns {Promise<import('./types.js').LavaMoatEndoPolicy>}
 */
export async function toEndoPolicy(lmPolicy) {
  // policy for self; needed for attenuator
  const overrides = await readPolicy(
    new URL('./policy-override.json', import.meta.url)
  )

  const finalLMPolicy = mergePolicy(lmPolicy, overrides)

  /** @type {import('./types.js').LavaMoatEndoPolicy} */
  const endoPolicy = {
    defaultAttenuator: DEFAULT_ATTENUATOR,
    entry: {
      [RSRC_POLICY_GLOBALS]: [POLICY_ITEM_ROOT],
      [RSRC_POLICY_PKGS]: POLICY_ITEM_WILDCARD,
      [RSRC_POLICY_BUILTINS]: POLICY_ITEM_WILDCARD,
      noGlobalFreeze: true,
    },
    resources: fromEntries(
      entries(finalLMPolicy.resources ?? {}).map(([rsrcName, rsrcPolicy]) => [
        rsrcName,
        toEndoRsrcPkgsPolicy(rsrcPolicy),
      ])
    ),
  }

  return endoPolicy
}
