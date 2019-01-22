const test = require('tape')
const inspectGlobals = require('../src/inspectGlobals')

test('picking out properties on window', (t) => {
  const globals = inspectGlobals(`
    window.location
  `)
  const windowGlobal = globals[0]
  t.equal(windowGlobal.name, 'window')
  const identifierNode = windowGlobal.nodes[0]
  const memberExpression = identifierNode.parents[identifierNode.parents.length - 2]
  t.equal(memberExpression.property.name, 'location')
  t.end()
})
