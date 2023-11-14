const { default: traverse } = require('@babel/traverse')
const {
  globalPropertyNames: defaultNamedIntrinsics,
} = require('./primordials.js')
const { isMemberLikeExpression } = require('./util.js')

module.exports = { inspectPrimordialAssignments }

/**
 * @typedef PrimordialAssignment
 * @property {import('@babel/traverse').Node} node
 * @property {import('@babel/traverse').NodePath} path
 * @property {string[]} memberPath
 */

/**
 * @typedef {import('@babel/types').MemberExpression | import('@babel/types').OptionalMemberExpression} MemberLikeExpression
 */

/**
 * @typedef {MemberLikeExpression & Omit<MemberLikeExpression, 'computed'> & {computed: false}} NonComputedMemberLikeExpression
 */

/**
 *
 * @param {import('@babel/types').Node} ast
 * @param {readonly string[]} namedIntrinsics
 * @returns {PrimordialAssignment[]}
 */
function inspectPrimordialAssignments(
  ast,
  namedIntrinsics = defaultNamedIntrinsics
) {
  /** @type {PrimordialAssignment[]} */
  const results = []
  traverse(ast, {
    AssignmentExpression: function (path) {
      const { node } = path
      const { left } = node
      // select for assignment to a property
      if (!isMemberLikeExpression(left)) {
        return
      }
      const { property, computed } = left
      // skip if property name is a variable
      if (computed) {
        return
      }
      if (property.type !== 'Identifier') {
        return
      }
      // check for assignment to intrinsic
      const memberPath = memberExpressionChainToPath(left)
      const rootIdentifierName = memberPath[0]
      // check if it looks like we're assigning to an intrinsic
      const looksLikeIntrinsic = namedIntrinsics.includes(rootIdentifierName)
      if (!looksLikeIntrinsic) {
        return
      }
      // check if this shadowed reference and not the intrinsic
      const binding = path.scope.getBinding(rootIdentifierName)
      if (binding) {
        return
      }
      // its a match!
      results.push({ node, path, memberPath })
    },
  })
  return results
}

/**
 *
 * @param {MemberLikeExpression} node
 * @returns {string[]}
 */
function memberExpressionChainToPath(node) {
  /** @type {string[]} */
  const path = []
  // walk down property chain
  while (isMemberLikeExpression(node.object)) {
    // @ts-ignore - FIXME needs logic changes for type safety
    path.push(node.property.name)
    node = node.object
  }
  // reached the end
  // @ts-ignore - FIXME needs logic changes for type safety
  path.push(node.property.name)
  // @ts-ignore - FIXME needs logic changes for type safety
  path.push(node.object.name)
  // fix order
  path.reverse()
  return path
}
