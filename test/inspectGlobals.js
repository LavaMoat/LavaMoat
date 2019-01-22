const test = require('tape')
const inspectGlobals = require('../src/inspectGlobals')

test('basic', (t) => {
  const globals = inspectGlobals(`
    atob
  `)
  t.equal(globals[0].name, 'atob')
  t.end()
})

test('picking out properties on window', (t) => {
  const globals = inspectGlobals(`
    window.location
  `)
  t.equal(globals[0].name, 'location')
  t.end()
})

test('picking out properties on global', (t) => {
  const globals = inspectGlobals(`
    global.localStorage
  `)
  t.equal(globals[0].name, 'localStorage')
  t.end()
})


test('picking out properties on self', (t) => {
  const globals = inspectGlobals(`
    self.WebSocket
  `)
  t.equal(globals[0].name, 'WebSocket')
  t.end()
})

test('not picking up properties from non-global self', (t) => {
  const globals = inspectGlobals(`
    var self = {}
    self.localStorage
  `)
  t.deepEqual(globals, [])
  t.end()
})
