const {
  inspectPrimordialAssignments,
} = require('./inspectPrimordialAssignments.js')
const {
  whitelist: sesAllowlist,
  FunctionInstance,
} = require('./ses-whitelist.js')
const { inspectDynamicRequires } = require('./inspectSource.js')

module.exports = { inspectSesCompat }

const strictModeViolationErrorCues = /** @type {const} */ ([
  'Unexpected reserved word',
  'Legacy octal literals are not allowed in strict mode',
  'Expecting Unicode escape sequence',
  "'with' in strict mode",
  'Deleting local variable in strict mode',
])

/**
 * Babel doesn't type `ParseError` very well.
 *
 * @typedef {import('@babel/parser').ParseError &
 *   Error & {
 *     loc: { line: number; column: number; index: number }
 *     pos: number
 *   }} ParseError
 */

/**
 * @typedef {Omit<
 *   import('@babel/parser').ParseResult<import('@babel/types').File>,
 *   'errors'
 * > & {
 *   errors?: (import('@babel/parser').ParseError &
 *     Error & {
 *       loc: { line: number; column: number; index: number }
 *       pos: number
 *     })[]
 * }} ParseResult
 */

/**
 * @typedef StrictModeViolation
 * @property {ParseError} error
 * @property {ParseError['loc']} loc
 * @property {ParseError['loc']['index']} pos
 */

/**
 * @typedef InspectSesCompatResult
 * @property {import('./inspectPrimordialAssignments.js').PrimordialAssignment[]} primordialMutations
 * @property {StrictModeViolation[]} strictModeViolations
 * @property {import('./inspectSource.js').RequireCallResult[]} dynamicRequires
 */

/**
 * @param {ParseResult} ast
 * @returns {InspectSesCompatResult}
 */
function inspectSesCompat(ast) {
  /** @type {InspectSesCompatResult} */
  const results = {
    primordialMutations: [],
    strictModeViolations: [],
    dynamicRequires: [],
  }
  // check for strict mode violations
  ;(ast.errors || []).forEach((error) => {
    if (
      strictModeViolationErrorCues.some((msg) => error.message.includes(msg))
    ) {
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
    .filter(
      (k) =>
        k in global &&
        // @ts-expect-error - Reflect.ownKeys loses type info
        typeof sesAllowlist[k] === 'object'
    )
    .map(String)

  const possibleHits = inspectPrimordialAssignments(ast, sesNamedIntrinsics)
  // check mutations for ses compat
  possibleHits.forEach((intrinsicMutation) => {
    const { memberPath } = intrinsicMutation
    if (hasSetterInWhitelist(memberPath)) {
      return
    }
    results.primordialMutations.push(intrinsicMutation)
  })
  // check for dynamic (non-string literal) requires
  results.dynamicRequires = inspectDynamicRequires(ast)
  return results
}

/**
 * @param {string[]} memberPath
 * @returns {boolean}
 */
function hasSetterInWhitelist(memberPath) {
  let allowListTarget = /** @type {Record<string, any>} */ (sesAllowlist)
  // ensure member path in whitelist
  for (const pathPart of memberPath) {
    if (!(pathPart in allowListTarget)) {
      return false
    }
    allowListTarget = allowListTarget[pathPart]
    // new target must be an object for further lookup
    if (typeof allowListTarget !== 'object') {
      return false
    }
  }
  // ensure setting for path is accessor
  const hasGetter = allowListTarget.get === FunctionInstance
  return hasGetter
}
