const acornGlobals = require('acorn-globals')

const moduleScope = [
  // commonjs basics
  'module',
  'exports',
  'require',
  // used for extra module features (usually module override via browser field)
  'arguments',
  // common in UMD builds
  'define',
  'this'
]

const globalRefs = [
  'global',
  'window',
  'self',
  'globalThis',
]

const ignoredGlobals = [
  // we handle this elsewhere
  'global',
]

// available in SES realms
// from Object.getOwnPropertyNames(realm.global)
const standardGlobals = [
  'Infinity',
  'NaN',
  'undefined',
  'isFinite',
  'isNaN',
  'parseFloat',
  'parseInt',
  'decodeURI',
  'decodeURIComponent',
  'encodeURI',
  'encodeURIComponent',
  'Array',
  'ArrayBuffer',
  'Boolean',
  'DataView',
  'Date',
  'Error',
  'EvalError',
  'Float32Array',
  'Float64Array',
  'Int8Array',
  'Int16Array',
  'Int32Array',
  'Map',
  'Number',
  'Object',
  'Promise',
  'Proxy',
  'RangeError',
  'ReferenceError',
  'RegExp',
  'Set',
  'String',
  'Symbol',
  'SyntaxError',
  'TypeError',
  'Uint8Array',
  'Uint8ClampedArray',
  'Uint16Array',
  'Uint32Array',
  'URIError',
  'WeakMap',
  'WeakSet',
  'JSON',
  'Math',
  'Reflect',
  'escape',
  'unescape',
  'Intl',
  'Realm',
  'eval',
  'Function',
]

module.exports = inspectGlobals

function inspectGlobals (ast) {
  const detectedGlobals = acornGlobals(ast)
  const globalNames = []

  // check for global refs with member expressions
  detectedGlobals.forEach(inspectDetectedGlobalVariables)

  // we sort to provide a more deterministic result
  const sortedNames = globalNames.sort()
  // reduce to remove more deep results that overlap with broader results
  // e.g. [`x.y.z`, `x.y`] can be reduced to just [`x.y`]
  const reducedNames = reduceToTopmostApiCalls(sortedNames)
  return reducedNames

  function inspectDetectedGlobalVariables (variable) {
    const variableName = variable.name
    // skip if module global
    if (moduleScope.includes(variableName)) return
    // expose API as granularly as possible
    variable.nodes.forEach(identifierNode => {
      inspectIdentifierForMembershipChain(variableName, identifierNode)
    })
  }

  function inspectIdentifierForMembershipChain (variableName, identifierNode) {
    const memberExpressions = getMemberExpressionNesting(identifierNode)
    // if not used in any member expressions AND is not a global ref, expose as is
    if (!memberExpressions.length) {
      // skip if global and only used for detecting presence
      // this is a bit of a hack to prevent exposing things that aren't actually used
      if (globalRefs.includes(variableName) && isUndefinedCheck(identifierNode)) return
      maybeAddGlobalName(variableName)
      return
    }
    const memberKeys = getKeysForMemberExpressionChain(memberExpressions)
    // if nested API lookup begins with a globalRef, drop it
    if (globalRefs.includes(memberKeys[0])) {
      memberKeys.shift()
    }
    // add nested API
    const nestedName = memberKeys.join('.')
    maybeAddGlobalName(nestedName)
  }

  function maybeAddGlobalName (variableName) {
    const apiRoot = variableName.split('.')[0]
    // skip ignored globals
    if (ignoredGlobals.includes(apiRoot)) return
    // ignore unknown non-platform globals
    if (standardGlobals.includes(apiRoot)) return
    // add variable to results
    globalNames.push(variableName)
  }
}

function getMemberExpressionNesting (identifierNode) {
  const parents = identifierNode.parents.slice(0, -1)
  const memberExpressions = getTailmostMatchingChain(parents, isDirectMemberExpression).reverse()
  return memberExpressions
}

function getKeysForMemberExpressionChain (memberExpressions) {
  const keys = memberExpressions.map(member => member.property.name)
  const rootMemberExpression = memberExpressions[0]
  const rootName = rootMemberExpression.object.name
  keys.unshift(rootName)
  return keys
}

function isDirectMemberExpression (node) {
  return node.type === 'MemberExpression' && !node.computed
}

function isUndefinedCheck (identifierNode) {
  const parentExpression = identifierNode.parents[identifierNode.parents.length - 2]
  const isTypeof = (parentExpression.type === 'UnaryExpression' || parentExpression.operator === 'typeof')
  return isTypeof
}

function getTailmostMatchingChain (items, matcher) {
  const onlyMatched = items.map(item => matcher(item) ? item : null)
  const lastIndex = onlyMatched.lastIndexOf(null)
  if (lastIndex === -1) return onlyMatched.slice()
  return onlyMatched.slice(lastIndex + 1)
}

// if array contains 'x' and 'x.y' just keep 'x'
function reduceToTopmostApiCalls (array) {
  return array.filter((entry) => {
    const parts = entry.split('.')
    if (parts.length === 1) return true
    // 'x.y.z' has parents 'x' and 'x.y'
    const parentParts = parts.slice(0, -1)
    const parents = parentParts.map((_, index) => parentParts.slice(0, index + 1).join('.'))
    // dont include this if a parent appears in the array
    const parentsAlreadyInArray = parents.some(parent => array.includes(parent))
    if (parentsAlreadyInArray) return false
    // if no parents found, ok to include
    return true
  })
}
