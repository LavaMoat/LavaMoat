const { repairs } = require('./repairs/index')
const { readFileSync } = require('node:fs')

/**
 * Combines the sources of only the repairs that are needed based on the policy
 *
 * @param {import('lavamoat-core').LavaMoatPolicy} policy
 */
exports.buildRepairs = (policy) => {
  const availableRepairs = new Set(Object.keys(repairs))
  // iterate over policy resources and look through their globals. If a global is in availableRepairs, add it to the repairsNeeded set.
  const repairsNeeded = new Set()
  for (const resource of Object.values(policy.resources)) {
    if (resource.globals) {
      for (const global of Object.keys(resource.globals)) {
        const top = global.split('.')[0]
        if (availableRepairs.has(top)) {
          repairsNeeded.add(top)
        }
      }
    }
  }
  if (repairsNeeded.size === 0) {
    return ''
  }
  return Array.from(repairsNeeded)
    .map((/** @type {keyof typeof repairs} */ name) =>
      readFileSync(repairs[name], 'utf8')
    )
    .join(';\n')
}
