// @ts-check

const {
  reduceToTopmostApiCalls,
  validateHierarchy,
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
    entries(mergedPolicy.resources ?? {}).forEach(
      ([resourceId, packagePolicy]) => {
        const currentOverride = policyOverride.resources?.[resourceId] ?? {}
        if (hasOwn(packagePolicy, 'globals') && packagePolicy.globals) {
          packagePolicy.globals = dedupePolicyPaths({
            policyItems: packagePolicy.globals,
            overrideItems: currentOverride.globals,
            resourceId,
          })
        }
        if (hasOwn(packagePolicy, 'builtin') && packagePolicy.builtin) {
          packagePolicy.builtin = dedupePolicyPaths({
            policyItems: packagePolicy.builtin,
            overrideItems: currentOverride.builtin,
            resourceId,
          })
        }
      }
    )
    return /** @type {LavaMoatPolicy} */ (mergedPolicy)
  }
  return policyA
}

/**
 * @typedef {Object} DedupePolicyPathsOptions
 * @property {BuiltinPolicy | GlobalPolicy} policyItems - The primary policy
 *   items
 * @property {BuiltinPolicy | GlobalPolicy} [overrideItems] - Optional override
 *   items
 * @property {string} resourceId - The resource identifier
 */

/**
 * @overload
 * @param {DedupePolicyPathsOptions & { policyItems: BuiltinPolicy }} options
 * @returns {BuiltinPolicy}
 */
/**
 * @overload
 * @param {DedupePolicyPathsOptions & { policyItems: GlobalPolicy }} options
 * @returns {GlobalPolicy}
 */
/**
 * @param {DedupePolicyPathsOptions} options
 * @returns {BuiltinPolicy | GlobalPolicy}
 */
function dedupePolicyPaths({ policyItems, overrideItems, resourceId }) {
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

  const violations = validateHierarchy(itemMap)
  if (violations.length > 0) {
    const violationMessages = violations.map(({ path, parent }) => {
      return `"${path}" is invalid when "${parent}" is also present in policy"`
    })
    throw new Error(
      `LavaMoat - Policy hierarchy validation failed for resource "${resourceId}"
  ${violationMessages.join('\n  ')}
You could set the parent "${violations[0].parent}" to false if you intended to override to a less permissive policy.`
    )
  }

  return /** @type {BuiltinPolicy | GlobalPolicy} */ (mapToObj(itemMap))
}

module.exports = { mergePolicy }
