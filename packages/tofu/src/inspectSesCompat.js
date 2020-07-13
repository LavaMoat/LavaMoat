const { inspectPrimordialAssignments } = require('./inspectPrimordialAssignments.js')
const { whitelist: sesAllowlist, FunctionInstance } = require('./ses-whitelist.js')

module.exports = { inspectSesCompat }

function inspectSesCompat (ast) {
  const results = {
    intrinsicMutations: []
  }
  // check for mutations to named intrinsics
  const sesNamedIntrinsics = Reflect.ownKeys(sesAllowlist)
    .filter(k => k in global && typeof sesAllowlist[k] === 'object')
  const possibleHits = inspectPrimordialAssignments(ast, sesNamedIntrinsics)
  // check mutations for ses compat
  possibleHits.forEach((intrinsicMutation) => {
    const { memberPath } = intrinsicMutation
    if (hasSetterInWhitelist(memberPath)) return
    results.intrinsicMutations.push(intrinsicMutation)
  })
  return results
}

function hasSetterInWhitelist (memberPath) {
  let allowListTarget = sesAllowlist
  // ensure member path in whitelist
  for (const [index, pathPart] of Object.entries(memberPath)) {
    if (!(pathPart in allowListTarget)) return false
    allowListTarget = allowListTarget[pathPart]
    // new target must be an object for further lookup
    if (typeof allowListTarget !== 'object') return false
  }
  // ensure setting for path is accessor
  const hasGetter = allowListTarget.get === FunctionInstance
  return hasGetter
}