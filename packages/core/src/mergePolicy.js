// @ts-check

const {
  reduceToTopmostApiCalls,
  objToMap,
  mapToObj,
} = require('lavamoat-tofu/src/util')
const mergeDeep = require('merge-deep')

const { values, hasOwn } = Object

/**
 * @import {LavaMoatPolicy, LavaMoatPolicyOverrides, GlobalPolicy, BuiltinPolicy, GlobalPolicyValue} from '@lavamoat/types'
 */

/**
 * Merges two policies together.
 *
 * `policyB` overwrites `policyA` where concatenation is not possible
 *
 * @param {LavaMoatPolicy} policyA First policy
 * @param {LavaMoatPolicy | LavaMoatPolicyOverrides} [policyB] Second policy or
 *   policy override
 * @returns {LavaMoatPolicy} Merged policy or `policyA` if `policyB` not
 *   provided
 */
function mergePolicy(policyA, policyB) {
  if (policyB) {
    const mergedPolicy = mergeDeep(policyA, policyB)
    values(mergedPolicy.resources ?? {}).forEach((packagePolicy) => {
      if (hasOwn(packagePolicy, 'globals') && packagePolicy.globals) {
        packagePolicy.globals = dedupePolicyPaths(packagePolicy.globals)
      }
      if (hasOwn(packagePolicy, 'builtin') && packagePolicy.builtin) {
        packagePolicy.builtin = dedupePolicyPaths(packagePolicy.builtin)
      }
    })
    return /** @type {LavaMoatPolicy} */ (mergedPolicy)
  }
  return policyA
}

/**
 * @template {BuiltinPolicy | GlobalPolicy} T
 * @param {T} packagePolicy
 * @returns {T}
 */
function dedupePolicyPaths(packagePolicy) {
  const itemMap = /** @type {Map<string, GlobalPolicyValue>} */ (
    objToMap(packagePolicy)
  )
  reduceToTopmostApiCalls(itemMap)
  return /** @type {T} */ (mapToObj(itemMap))
}

module.exports = { mergePolicy }
