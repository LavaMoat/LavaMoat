
module.exports = {
  getMemberExpressionNesting,
  getPathFromMemberExpressionChain,
  isDirectMemberExpression,
  isUndefinedCheck,
  getTailmostMatchingChain,
  reduceToTopmostApiCalls,
  addGlobalUsage,
  mergeConfig,
  objToMap,
  mapToObj
}

function getMemberExpressionNesting (identifierNode) {
  // remove the identifier node itself
  const parents = identifierNode.parents.slice(0, -1)
  // find unbroken membership chain closest to identifier
  const memberExpressions = getTailmostMatchingChain(parents, isDirectMemberExpression).reverse()
  // find parent of membership chain
  const hasMembershipChain = Boolean(memberExpressions.length)
  const topmostMember = hasMembershipChain ? memberExpressions[0] : identifierNode
  const topmostMemberIndex = identifierNode.parents.indexOf(topmostMember)
  if (topmostMemberIndex < 1) {
    throw Error('unnexpected value for memberTopIndex')
  }
  const topmostMemberParentIndex = topmostMemberIndex - 1
  const parentOfMembershipChain = identifierNode.parents[topmostMemberParentIndex]
  return { memberExpressions, parentOfMembershipChain, topmostMember }
}

function getPathFromMemberExpressionChain (memberExpressions) {
  const keys = memberExpressions.map(member => getNameFromNode(member.property))
  return keys
}

function getNameFromNode (node) {
  if (node.type === 'Identifier') {
    return node.name
  } else if (node.type === 'ThisExpression') {
    return 'this'
  } else {
    throw new Error(`unknown ast node type when trying to get name: "${node.type}"`)
  }
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
function reduceToTopmostApiCalls (globalsConfig) {
  const allPaths = Array.from(globalsConfig.keys()).sort()
  return allPaths.forEach((path) => {
    const parts = path.split('.')
    // only one part, safe to keep
    if (parts.length === 1) {
      return
    }
    // 'x.y.z' has parents 'x' and 'x.y'
    const parentParts = parts.slice(0, -1)
    const parents = parentParts.map((_, index) => parentParts.slice(0, index + 1).join('.'))
    // dont include this if a parent appears in the array
    const parentsAlreadyInArray = parents.some(parent => allPaths.includes(parent))
    if (parentsAlreadyInArray) {
      globalsConfig.delete(path)
    }
    // if no parents found, ok to include
  })
}

function addGlobalUsage (globalsConfig, identifierPath, identifierUse) {
  // add variable to results, if not already set
  if (globalsConfig.has(identifierPath) && identifierUse !== 'write') return
  globalsConfig.set(identifierPath, identifierUse)
}

function mergeConfig (configA, configB) {
  const newConfig = new Map(configA)
  Array.from(configB.entries()).forEach(([path, value]) => {
    addGlobalUsage(newConfig, path, value)
  })
  reduceToTopmostApiCalls(newConfig)
  return newConfig
}

function objToMap (obj) {
  return new Map(Object.entries(obj))
}

// Object.fromEntries not available in node v10
function mapToObj (map) {
  const obj = {}
  map.forEach((value, key) => { obj[key] = value })
  return obj
}
