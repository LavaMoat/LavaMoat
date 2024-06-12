import { mergePolicy } from 'lavamoat-core'
import {
  LAVAMOAT_PKG_POLICY_ROOT,
  LAVAMOAT_RESOURCE_FLAG_DYNAMIC,
  LAVAMOAT_RESOURCE_FLAG_NATIVE,
  POLICY_ITEM_ROOT,
  POLICY_ITEM_WILDCARD,
  RSRC_POLICY_BUILTINS,
  RSRC_POLICY_GLOBALS,
  RSRC_POLICY_OPTION_DYNAMIC,
  RSRC_POLICY_OPTION_NATIVE,
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
function convertEndoPackagePolicyBuiltins(item) {
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
function convertEndoPackagePolicyPackages(item) {
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
      policyItem[key] = Boolean(value)
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
function convertEndoPackagePolicyGlobals(item) {
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
 * @param {import('lavamoat-core').ResourcePolicy} [resources]
 * @returns {import('./types.js').LavaMoatPackagePolicyOptions | undefined}
 */
function convertEndoPackagePolicyOptions(resources) {
  if (!resources) {
    return undefined
  }
  /** @type {import('./types.js').LavaMoatPackagePolicyOptions | undefined} */
  let pkgPolicyOptions
  if (resources[LAVAMOAT_RESOURCE_FLAG_NATIVE] === true) {
    pkgPolicyOptions = { [RSRC_POLICY_OPTION_NATIVE]: true }
  }
  if (resources[LAVAMOAT_RESOURCE_FLAG_DYNAMIC] === true) {
    pkgPolicyOptions = {
      ...pkgPolicyOptions,
      [RSRC_POLICY_OPTION_DYNAMIC]: true,
    }
  }
  return pkgPolicyOptions
}

/**
 * Converters LavaMoat `ResourcePolicy` to Endo's `PackagePolicy`
 *
 * @param {import('lavamoat-core').ResourcePolicy} resources
 * @returns {import('./types.js').LavaMoatPackagePolicy}
 */
function convertEndoPackagePolicy(resources) {
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
        convertEndoPackagePolicy(rsrcPolicy),
      ])
    ),
  }

  return endoPolicy
}
