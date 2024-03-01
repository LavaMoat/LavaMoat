const {
  reduceToTopmostApiCalls,
  objToMap,
  mapToObj,
} = require('lavamoat-tofu/src/util')
const mergeDeep = require('merge-deep')

/**
 * Merges two policies together.
 *
 * `policyB` overwrites `policyA` where concatenation is not possible
 *
 * @param {import('./schema').LavaMoatPolicy} policyA First policy
 * @param {import('./schema').LavaMoatPolicy
 *   | import('./schema').LavaMoatPolicyOverrides} [policyB]
 *   Second policy or policy override
 * @returns {import('./schema').LavaMoatPolicy} Merged policy or `policyA` if
 *   `policyB` not provided
 */
function mergePolicy(policyA, policyB) {
  if (policyB) {
    const mergedPolicy = mergeDeep(policyA, policyB)
    Object.values(mergedPolicy.resources).forEach((packagePolicy) => {
      if ('globals' in packagePolicy) {
        packagePolicy.globals = dedupePolicyPaths(packagePolicy.globals)
      }
      if ('builtin' in packagePolicy) {
        packagePolicy.builtin = dedupePolicyPaths(packagePolicy.builtin)
      }
    })
    return /** @type {LavaMoatPolicy} */ (mergedPolicy)
  }
  return policyA
}

function dedupePolicyPaths(packagePolicy) {
  const itemMap = objToMap(packagePolicy)
  reduceToTopmostApiCalls(itemMap)
  return mapToObj(itemMap)
}

module.exports = { mergePolicy }
