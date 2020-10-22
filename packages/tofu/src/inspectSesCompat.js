const lineColumn = require('line-column')
const { inspectPrimordialAssignments } = require('./inspectPrimordialAssignments.js')
const { whitelist: sesAllowlist, FunctionInstance } = require('./ses-whitelist.js')
const { inspectDynamicRequires } = require('./inspectSource.js')

// from https://github.com/Agoric/SES-shim/blob/86a373e008e97b2a30c25ee53df86ab120a7804b/packages/ses/src/transforms.js#L75
// with added global flag
const importPattern = new RegExp('\\bimport\\s*(?:\\(|/[/*])', 'gm');


module.exports = { inspectSesCompat }

const strictModeViolationErrorCues = [
  'Unexpected reserved word',
  'Legacy octal literals are not allowed in strict mode',
  'Expecting Unicode escape sequence',
  '\'with\' in strict mode',
  'Deleting local variable in strict mode'
]

function inspectSesCompat (moduleRecord) {
  const { content, ast } = moduleRecord
  const results = {
    primordialMutations: [],
    strictModeViolations: [],
    dynamicRequires: [],
    importStatementMatches: []
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
  // check for import statement matches
  results.importStatementMatches = getImportStatementMatches(content)

  return results
}

function getImportStatementMatches (src) {
  return getAllMatches(src, importPattern)
}

function getAllMatches (str, regexp) {
  const matches = []
  let match
  while (match = regexp.exec(str)) {
    matches.push(getPosition(str, match.index, regexp.lastIndex));
  }
  return matches
}

function getPosition(string, startIndex, endIndex) {
  const finder = lineColumn(string)
  const { line: startLine, col: startColumn } = finder.fromIndex(startIndex)
  const { line: endLine, col: endColumn } = finder.fromIndex(endIndex)
  return {
    start: {
      line: startLine,
      column: startColumn - 1,
    },
    end: {
      line: endLine,
      column: endColumn - 1,
    }
  }
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
