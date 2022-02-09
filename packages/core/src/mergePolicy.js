const { reduceToTopmostApiCalls, objToMap, mapToObj } = require('lavamoat-tofu/src/util')
const mergeDeep = require('merge-deep')

module.exports = { mergePolicy }

function mergePolicy (policyA, policyB) {
  const mergedPolicy = mergeDeep(policyA, policyB)
  Object.values(mergedPolicy.resources).forEach((packagePolicy) => {
    if ('globals' in packagePolicy) {
      packagePolicy.globals = dedupePolicyPaths(packagePolicy.globals)
    }
    if ('builtin' in packagePolicy) {
      packagePolicy.builtin = dedupePolicyPaths(packagePolicy.builtin)
    }
  })
  return mergedPolicy
}

function dedupePolicyPaths (packagePolicy) {
  const itemMap = objToMap(packagePolicy)
  reduceToTopmostApiCalls(itemMap)
  return mapToObj(itemMap)
}
