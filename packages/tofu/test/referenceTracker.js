const test = require('tape')
const { parse, traverse } = require('../src/index.js')
const { expandUsage, pathLookup } = require('../src/referenceTracker.js')


test('basic', (t) => {
  // parse
  const ast = parseFn(() => {
    function a () {
      const x = { value: 42 }
      return x
    }
    
    function b (target) {
      console.log(target)
    }
    
    function c () {
      const y = a()
      b(y)
    }
  })
  // record path + contexts
  traverse(ast, {
    enter (path) {
      pathLookup.set(path.node, path)
    }
  })
  // unwrap the program and containing arrow expression iife
  const primaryContent = ast.program.body[0].expression.callee.body
  const primaryPath = pathLookup.get(primaryContent)
  
  // -> where does the identifier "x" in function "a" end up?
  const targetBinding = primaryPath.scope.getBinding('a').path.scope.getBinding('x')
  const analysis = expandUsage(targetBinding.path)

  // should find one untraceable leaf, the call to console.log
  t.equal(analysis.leaves.length, 1)
  t.equal(analysis.leaves[0].node.type, 'MemberExpression')
  t.equal(analysis.leaves[0].node.object.name, 'console')
  t.equal(analysis.leaves[0].node.property.name, 'log')
  
  t.end()
})

function parseFn (fn, opts) {
  const fnString = `(${fn})()`
  const ast = parse(fnString, opts)
  return ast
}