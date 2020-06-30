const { default: traverse } = require('@babel/traverse')

// higher number is less secure, more flexible
const environmentTypes = {
  frozen: 1,
  unfrozen: 2
}

const environmentTypeStrings = {
  1: 'frozen',
  2: 'unfrozen'
}

// derrived from ses's whitelist
// const { default: whitelist } = await import('ses/src/whitelist.js')
// Reflect.ownKeys(whitelist)
//   .filter(k => k in global && typeof whitelist[k] === 'object')
const namedIntrinsics = [
  'eval',               'isFinite',          'isNaN',
  'parseFloat',         'parseInt',          'decodeURI',
  'decodeURIComponent', 'encodeURI',         'encodeURIComponent',
  'Object',             'Function',          'Boolean',
  'Symbol',             'Error',             'EvalError',
  'RangeError',         'ReferenceError',    'SyntaxError',
  'TypeError',          'URIError',          'Number',
  'BigInt',             'Math',              'Date',
  'String',             'RegExp',            'Array',
  'BigInt64Array',      'BigUint64Array',    'Float32Array',
  'Float64Array',       'Int16Array',        'Int32Array',
  'Int8Array',          'Uint16Array',       'Uint32Array',
  'Uint8Array',         'Uint8ClampedArray', 'Map',
  'Set',                'WeakMap',           'WeakSet',
  'ArrayBuffer',        'DataView',          'JSON',
  'Promise',            'Reflect',           'Proxy',
  'escape',             'unescape'
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
      // check for assignment to primordial
      const memberPath = memberExpressionChainToPath(left)
      const match = namedIntrinsics.some(
        name => partialArrayMatch([name], memberPath)
      )
      if (match) {
        results.push(node)
      }
    }
  })
}

function partialArrayMatch (a, b) {
  for (const index in a) {
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
