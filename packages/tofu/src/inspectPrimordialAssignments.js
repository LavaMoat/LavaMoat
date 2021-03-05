const { default: traverse } = require('@babel/traverse')
const { globalPropertyNames: defaultNamedIntrinsics } = require('./primordials.js')

module.exports = { inspectPrimordialAssignments }

function inspectPrimordialAssignments (ast, namedIntrinsics = defaultNamedIntrinsics) {
  const results = []
  traverse(ast, {
    AssignmentExpression: function (path) {
      const { node } = path
      const { left } = node
      // select for assignment to a property
      if (left.type !== 'MemberExpression') return
      const { property, computed } = left
      // skip if property name is a variable
      if (computed) return
      if (property.type !== 'Identifier') return
      // check for assignment to intrinsic
      const memberPath = memberExpressionChainToPath(left)
      const rootIdentifierName = memberPath[0]
      // check if it looks like we're assigning to an intrinsic
      const looksLikeIntrinsic = namedIntrinsics.includes(rootIdentifierName)
      if (!looksLikeIntrinsic) return
      // check if this shadowed reference and not the intrinsic
      const binding = path.scope.getBinding(rootIdentifierName)
      if (binding) return
      // its a match!
      results.push({ node, path, memberPath })
    }
  })
  return results
}

function memberExpressionChainToPath (node) {
  const path = []
  // walk down property chain
  while ((node.object.type === 'MemberExpression')) {
    path.push(node.property.name)
    node = node.object
  }
  // reached the end
  path.push(node.property.name)
  path.push(node.object.name)
  // fix order
  path.reverse()
  return path
}
