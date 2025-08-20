const { readFileSync } = require('node:fs')
const { repairs } = require('./repairs/index')

/**
 * Combines the sources of only the repairs that are needed based on the policy
 *
 * @param {import('lavamoat-core').LavaMoatPolicy} policy
 */
exports.buildRepairs = (policy) => {
  const allGlobalsInvolved = new Set()
  for (const resource of Object.values(policy.resources)) {
    if (resource.globals) {
      for (const global of Object.keys(resource.globals)) {
        const top = global.split('.')[0]
        allGlobalsInvolved.add(top)
      }
    }
  }
  const repairsToInclude = repairs.filter((repair) =>
    repair.target.some((target) => {
      return allGlobalsInvolved.has(target)
    })
  )

  return repairsToInclude
    .map(({ file }) => readFileSync(file, 'utf8'))
    .join(';\n;')
}
