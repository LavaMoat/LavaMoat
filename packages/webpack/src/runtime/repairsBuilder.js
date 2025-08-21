const { readFileSync } = require('node:fs')
const { repairs } = require('./repairs/index')

/**
 * Combines the sources of only the repairs that are needed based on the policy
 *
 * @param {import('lavamoat-core').LavaMoatPolicy} policy
 * @param {string[]} [skipRepairs]
 */
exports.buildRepairs = (policy, skipRepairs) => {
  const repairsAvailable =
    Array.isArray(skipRepairs) && skipRepairs.length > 0
      ? repairs.filter(
          (repair) =>
            !repair.target.some((target) => {
              return skipRepairs.includes(target)
            })
        )
      : repairs
  const allGlobalsInvolved = new Set()
  for (const resource of Object.values(policy.resources)) {
    if (resource.globals) {
      for (const global of Object.keys(resource.globals)) {
        const top = global.split('.')[0]
        allGlobalsInvolved.add(top)
      }
    }
  }
  const repairsToInclude = repairsAvailable.filter((repair) =>
    repair.target.some((target) => {
      return allGlobalsInvolved.has(target)
    })
  )

  return repairsToInclude
    .map(({ file }) => readFileSync(file, 'utf8'))
    .join(';\n;')
}
