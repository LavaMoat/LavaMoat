module.exports = {
  getMemberExpressionNesting,
  getPathFromMemberExpressionChain,
  isNonComputedMemberLikeExpression,
  isUndefinedCheck,
  getTailmostMatchingChain,
  reduceToTopmostApiCalls,
  reduceToTopmostApiCallsFromStrings,
  addGlobalUsage,
  mergePolicy,
  objToMap,
  mapToObj,
  getParents,
  isInFunctionDeclaration,
  isMemberLikeExpression,
}

/**
 * @typedef MemberExpressionNesting
 * @property {import("./inspectPrimordialAssignments").NonComputedMemberLikeExpression[]} memberExpressions
 * @property {import("./inspectPrimordialAssignments").MemberLikeExpression} parentOfMembershipChain
 * @property {import("./inspectPrimordialAssignments").MemberLikeExpression|import("@babel/types").LVal} topmostMember
 */

/**
 * @param {import("@babel/types").Node} identifierNode
 * @param {import("@babel/types").Node[]} parents
 * @returns
 */
function getMemberExpressionNesting(identifierNode, parents) {
  // remove the identifier node itself
  const parentsOnly = parents.slice(0, -1)
  // find unbroken membership chain closest to identifier
  const memberExpressions = getTailmostMatchingChain(
    /** @type {import("./inspectPrimordialAssignments").NonComputedMemberLikeExpression[]} */ (
      parentsOnly
    ),
    isNonComputedMemberLikeExpression
  ).reverse()
  // find parent of membership chain
  const hasMembershipChain = Boolean(memberExpressions.length)
  const topmostMember = hasMembershipChain
    ? memberExpressions[0]
    : identifierNode
  const topmostMemberIndex = parents.indexOf(topmostMember)
  if (topmostMemberIndex < 1) {
    throw Error('unnexpected value for memberTopIndex')
  }
  const topmostMemberParentIndex = topmostMemberIndex - 1
  const parentOfMembershipChain = parents[topmostMemberParentIndex]
  return { memberExpressions, parentOfMembershipChain, topmostMember }
}

/**
 *
 * @param {import("./inspectPrimordialAssignments").MemberLikeExpression[]} memberExpressions
 * @returns {string[]}
 */
function getPathFromMemberExpressionChain(memberExpressions) {
  const keys = memberExpressions.map((member) =>
    getNameFromNode(member.property)
  )
  return keys
}

/**
 *
 * @param {import("@babel/types").Node} node
 * @returns {string}
 */
function getNameFromNode(node) {
  if (node.type === 'Identifier') {
    return node.name
  } else if (node.type === 'ThisExpression') {
    return 'this'
  } else if (node.type === 'PrivateName') {
    return `#${node.id.name}`
  } else {
    throw new Error(
      `unknown ast node type when trying to get name: "${node.type}"`
    )
  }
}

/**
 *
 * @param {import("@babel/types").Node} node
 * @returns {node is import("./inspectPrimordialAssignments").MemberLikeExpression}
 */
function isMemberLikeExpression(node) {
  return (
    node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression'
  )
}

/**
 *
 * @param {import("./inspectPrimordialAssignments").MemberLikeExpression} node
 * @returns {node is import("./inspectPrimordialAssignments").NonComputedMemberLikeExpression}
 */
function isNonComputedMemberLikeExpression(node) {
  return !node.computed && isMemberLikeExpression(node)
}

/**
 *
 * @param {import("@babel/types").LVal} identifierNode
 * @param {import("@babel/types").Node[]} parents
 * @returns {boolean}
 */
function isUndefinedCheck(identifierNode, parents) {
  const parentExpression =
    /** @type {import("@babel/types").UnaryExpression} */ (
      parents[parents.length - 2]
    )
  const isTypeof =
    parentExpression.type === 'UnaryExpression' ||
    parentExpression.operator === 'typeof'
  return isTypeof
}

/**
 * @template {any} T
 * @param {T[]} items
 * @param {(item: T) => item is T} matcher
 * @returns {T[]}
 */
function getTailmostMatchingChain(items, matcher) {
  const onlyMatched = items.map((item) => (matcher(item) ? item : null))
  const lastIndex = onlyMatched.lastIndexOf(null)
  return /** @type {T[]} */ (
    lastIndex === -1 ? onlyMatched.slice() : onlyMatched.slice(lastIndex + 1)
  )
}

/**
 * if array contains 'x' and 'x.y' just keep 'x'
 * @param {Map<string, import('lavamoat-core').GlobalPolicyValue>} globalsConfig
 * @returns
 */
function reduceToTopmostApiCalls(globalsConfig) {
  const allPaths = Array.from(globalsConfig.keys()).sort()
  return allPaths.forEach((path) => {
    const parts = path.split('.')
    // only one part, safe to keep
    if (parts.length === 1) {
      return
    }
    // 'x.y.z' has parents 'x' and 'x.y'
    const parentParts = parts.slice(0, -1)
    const parents = parentParts.map((_, index) =>
      parentParts.slice(0, index + 1).join('.')
    )
    // dont include this if a parent appears in the array
    const parentsAlreadyInArray = parents.some((parent) =>
      allPaths.includes(parent)
    )
    if (parentsAlreadyInArray) {
      globalsConfig.delete(path)
    }
    // if no parents found, ok to include
  })
}

/**
 * if array contains 'x' and 'x.y' just keep 'x'
 * @param {string[]} keyPathStrings
 * @returns {string[]}
 */
function reduceToTopmostApiCallsFromStrings(keyPathStrings) {
  // because we sort first, we never have to back track
  const allPaths = keyPathStrings.sort()
  return allPaths.filter((path) => {
    const parts = path.split('.')
    // only one part, safe to keep
    if (parts.length === 1) {
      return true
    }
    // 'x.y.z' has parents 'x' and 'x.y'
    const parentParts = parts.slice(0, -1)
    const parents = parentParts.map((_, index) =>
      parentParts.slice(0, index + 1).join('.')
    )
    // dont include this if a parent appears in the array
    const parentsAlreadyInArray = parents.some((parent) =>
      allPaths.includes(parent)
    )
    if (parentsAlreadyInArray) {
      return false
    }
    // if no parents found, ok to include
    return true
  })
}

/**
 * add variable to results, if not already set
 * @param {Map<string, import('lavamoat-core').GlobalPolicyValue>} globalsConfig
 * @param {string} identifierPath
 * @param {import('lavamoat-core').GlobalPolicyValue} identifierUse
 */
function addGlobalUsage(globalsConfig, identifierPath, identifierUse) {
  if (globalsConfig.has(identifierPath) && identifierUse !== 'write') {
    return
  }
  globalsConfig.set(identifierPath, identifierUse)
}

/**
 * Merge two global policy configs (as `Map`s) together
 * @param {Map<string, import('lavamoat-core').GlobalPolicyValue>} configA
 * @param {Map<string, import('lavamoat-core').GlobalPolicyValue>} configB
 * @returns
 */
function mergePolicy(configA, configB) {
  const newConfig = new Map(configA)
  Array.from(configB.entries()).forEach(([path, value]) => {
    addGlobalUsage(newConfig, path, value)
  })
  reduceToTopmostApiCalls(newConfig)
  return newConfig
}

/**
 * @template {object} T
 * @param {T} obj
 * @returns {Map<keyof T, T[keyof T]>}
 */
function objToMap(obj) {
  return /** @type {Map<keyof T, T[keyof T]>} */ (new Map(Object.entries(obj)))
}

/**
 * @template V
 * @param {Map<PropertyKey, V>} map
 * @returns {{[k: string]: V}}if array contains 'x' and 'x.y' just keep 'x'
 */
function mapToObj(map) {
  return Object.fromEntries(map)
}

/**
 *
 * @param {import('@babel/traverse').NodePath<any>|null} nodePath
 * @returns {import("@babel/types").Node[]}
 */
function getParents(nodePath) {
  /** @type {import("@babel/types").Node[]} */
  const parents = []
  let target = nodePath
  while (target) {
    parents.push(target.node)
    target = /** @type {import('@babel/traverse').NodePath<any>} */ (
      target.parentPath
    )
  }
  parents.reverse()
  return parents
}

/**
 *
 * @param {import('@babel/traverse').NodePath<any>} path
 * @returns {boolean}
 */
function isInFunctionDeclaration(path) {
  return getParents(path.parentPath).some(
    (parent) =>
      parent.type === 'FunctionDeclaration' ||
      parent.type === 'FunctionExpression'
  )
}
