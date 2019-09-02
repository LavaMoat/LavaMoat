const walk = require('acorn-walk')

// higher number is less secure, more flexible 
const environmentTypes = {
  'frozen': 1,
  'unfrozen': 2,
}

const environmentTypeStrings = {
  1: 'frozen',
  2: 'unfrozen',
}

const primordialPaths = [
  ['Object'],
  ['Array']
]

module.exports = { inspectEnvironment, environmentTypes, environmentTypeStrings }

function inspectEnvironment (ast) {
  const results = []
  walkForProtectedAssignment(ast, results)
  if (results.length) {
    return environmentTypes.unfrozen
  } else {
    return environmentTypes.frozen
  }
}

function walkForProtectedAssignment (ast, results) {
  walk.ancestor(ast, {
    'AssignmentExpression': function (node, parents) {
      const { left } = node
      // select for assignment to a property
      if (left.type !== 'MemberExpression') return
      const { property, computed } = left
      // skip if property name is a variable
      if (computed) return
      if (property.type !== 'Identifier') return
      // check for assignment to primordial
      const memberPath = memberExpressionChainToPath(left)
      const match = primordialPaths.some(
        primordial => partialArrayMatch(primordial, memberPath)
      )
      if (match) {
        results.push(node)
      }
    },
  })
}

function partialArrayMatch (a,b) {
  for (let index in a) {
    const match = a[index] === b[index]
    if (!match) return false
  }
  return true
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