// @ts-check

const {
  reduceToTopmostApiCalls,
  objToMap,
  mapToObj,
} = require('lavamoat-tofu/src/util')
const mergeDeep = require('merge-deep')

const { entries, hasOwn } = Object

/**
 * @import {LavaMoatPolicy, GlobalPolicy, BuiltinPolicy, GlobalPolicyValue} from '@lavamoat/types'
 */

/**
 * Merges two policies together with priority to stricter decisions made in
 * policyOverride
 *
 * `policyOverride` overwrites `policyA` where concatenation is not possible
 *
 * @param {LavaMoatPolicy} policyA First policy
 * @param {LavaMoatPolicy} [policyOverride] Second policy or policy override
 * @returns {LavaMoatPolicy} Merged policy or `policyA` if `policyOverride` not
 *   provided
 */
function mergePolicy(policyA, policyOverride) {
  if (policyOverride) {
    const mergedPolicy = mergeDeep(policyA, policyOverride)
    entries(mergedPolicy.resources ?? {}).forEach(([path, packagePolicy]) => {
      const currentOverride = policyOverride.resources?.[path] ?? {}
      if (hasOwn(packagePolicy, 'globals') && packagePolicy.globals) {
        packagePolicy.globals = dedupePolicyPaths(
          packagePolicy.globals,
          currentOverride.globals
        )
      }
      if (hasOwn(packagePolicy, 'builtin') && packagePolicy.builtin) {
        packagePolicy.builtin = dedupePolicyPaths(
          packagePolicy.builtin,
          currentOverride.builtin
        )
      }
    })
    return /** @type {LavaMoatPolicy} */ (mergedPolicy)
  }
  return policyA
}

/**
 * @template {BuiltinPolicy | GlobalPolicy} T
 * @param {T} policyItems
 * @param {T} [overrideItems]
 * @returns {T}
 */
function dedupePolicyPaths(policyItems, overrideItems) {
  const itemMap = /** @type {Map<string, GlobalPolicyValue>} */ (
    objToMap(policyItems)
  )

  reduceToTopmostApiCalls(itemMap)

  // After we've removed all nesting to ensure denying a top-level field denies all generated sub-fields, we need to add back in the sub-fields explicitly allowed in overrides.
  if (overrideItems) {
    entries(overrideItems).forEach(([path, value]) => {
      if (value !== false && !itemMap.has(path)) {
        itemMap.set(path, value)
      }
    })
  }

  return /** @type {T} */ (mapToObj(itemMap))
}

module.exports = { mergePolicy }
