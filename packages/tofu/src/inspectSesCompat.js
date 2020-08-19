const { inspectPrimordialAssignments } = require('./inspectPrimordialAssignments.js')
const { whitelist: sesAllowlist, FunctionInstance } = require('./ses-whitelist.js')
const { inspectDynamicRequires } = require('./inspectSource.js')

module.exports = { inspectSesCompat }

const strictModeViolationErrorCues = [
  'Unexpected reserved word',
  'Legacy octal literals are not allowed in strict mode',
  'Expecting Unicode escape sequence',
  '\'with\' in strict mode',
  'Deleting local variable in strict mode'
]

function inspectSesCompat (ast) {
  const results = {
    primordialMutations: [],
    strictModeViolations: [],
    dynamicRequires: []
  }
  // check for strict mode violations
  ;(ast.errors || []).forEach(error => {
    if (strictModeViolationErrorCues.some(msg => error.message.includes(msg))) {
      const { loc, pos } = error
      results.strictModeViolations.push({ error, loc, pos })
    } else {
      console.log('no match', error.message)
      // encountered unknown error - throw
      throw error
    }
  })
  // check for mutations to named intrinsics
  const sesNamedIntrinsics = Reflect.ownKeys(sesAllowlist)
    .filter(k => k in global && typeof sesAllowlist[k] === 'object')
  const possibleHits = inspectPrimordialAssignments(ast, sesNamedIntrinsics)
  // check mutations for ses compat
  possibleHits.forEach((intrinsicMutation) => {
    const { memberPath } = intrinsicMutation
    if (hasSetterInWhitelist(memberPath)) return
    results.primordialMutations.push(intrinsicMutation)
  })
  // check for dynamic (non-string literal) requires
  results.dynamicRequires = inspectDynamicRequires(ast)
  return results
}

function hasSetterInWhitelist (memberPath) {
  let allowListTarget = sesAllowlist
  // ensure member path in whitelist
  for (const pathPart of memberPath) {
    if (!(pathPart in allowListTarget)) return false
    allowListTarget = allowListTarget[pathPart]
    // new target must be an object for further lookup
    if (typeof allowListTarget !== 'object') return false
  }
  // ensure setting for path is accessor
  const hasGetter = allowListTarget.get === FunctionInstance
  return hasGetter
}
