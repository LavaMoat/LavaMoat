import { mergePolicy } from 'lavamoat-core'
import {
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
import { assertPolicyOverride, readPolicyOverride } from './policy.js'

const { isArray } = Array
const { entries, fromEntries } = Object

/**
 * @import {LavaMoatPackagePolicy, LavaMoatPackagePolicyOptions, LavaMoatEndoPolicy} from './types.js'
 * @import {PackagePolicy, GlobalPolicy, ResourcePolicy, LavaMoatPolicy, LavaMoatPolicyOverrides} from 'lavamoat-core'
 */

const DEFAULT_ATTENUATOR = '@lavamoat/node/attenuator'

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
      policyItem[key] = Boolean(value)
    }
  }
  return policyItem
}

/**
 * Converts LavaMoat `ResourcePolicy.globals` to Endo's `PackagePolicy.globals`
 *
 * @param {GlobalPolicy} [item] - A value in `ResourcePolicy`
 * @returns {LavaMoatPackagePolicy['globals']}
 */
const convertEndoPackagePolicyGlobals = (item) => {
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
 * Converts a LavaMoat policy to an Endo policy
 *
 * @param {LavaMoatPolicy} lmPolicy
 * @returns {Promise<LavaMoatEndoPolicy>}
 * @public
 */
export const toEndoPolicy = async (lmPolicy) => {
  // policy for self; needed for attenuator
  /** @type {LavaMoatPolicyOverrides} */
  let overrides = {}
  const allegedOverrides = await readPolicyOverride(
    new URL('./policy-override.json', import.meta.url)
  )

  if (allegedOverrides) {
    assertPolicyOverride(allegedOverrides)
    overrides = allegedOverrides
  }

  const finalLMPolicy = mergePolicy(lmPolicy, overrides)

  /** @type {LavaMoatEndoPolicy} */
  const endoPolicy = {
    defaultAttenuator: DEFAULT_ATTENUATOR,
    entry: {
      [RSRC_POLICY_GLOBALS]: [POLICY_ITEM_ROOT],
      [RSRC_POLICY_PKGS]: POLICY_ITEM_WILDCARD,
      [RSRC_POLICY_BUILTINS]: POLICY_ITEM_WILDCARD,
      noGlobalFreeze: true,
    },
    resources: fromEntries(
      entries(finalLMPolicy.resources ?? {}).map(
        ([resourceName, resourcePolicy]) => [
          resourceName,
          convertEndoPackagePolicy(resourcePolicy),
        ]
      )
    ),
  }

  return endoPolicy
}
