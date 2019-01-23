const test = require('tape')
const inspectGlobals = require('../src/inspectGlobals')

test('basic', (t) => {
  const globals = inspectGlobals(`
    atob
  `)
  t.equal(globals[0], 'atob')
  t.end()
})

test('picking out properties on window', (t) => {
  const globals = inspectGlobals(`
    window.location
  `)
  t.equal(globals[0], 'location')
  t.end()
})

test('picking out properties on global', (t) => {
  const globals = inspectGlobals(`
    global.localStorage
  `)
  t.equal(globals[0], 'localStorage')
  t.end()
})


test('picking out properties on self', (t) => {
  const globals = inspectGlobals(`
    self.WebSocket
  `)
  t.equal(globals[0], 'WebSocket')
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

test('not picking up programmatic property lookups', (t) => {
  const globals = inspectGlobals(`
    window[key]
  `)
  t.deepEqual(globals[0], 'window')
  t.end()
})

test('picking up programmatic property lookups + explicit', (t) => {
  const globals = inspectGlobals(`
    window[key]
    window.location
  `)
  t.deepEqual(globals, ['window', 'location'])
  t.end()
})

test('not picking out userspace global', (t) => {
  const globals = inspectGlobals(`
    xyz = true
  `)
  t.deepEqual(globals, [])
  t.end()
})

test('not picking out userspace global on globalRef', (t) => {
  const globals = inspectGlobals(`
    global.xyz = true
  `)
  t.deepEqual(globals, [])
  t.end()
})

test('not picking up js language features', (t) => {
  const globals = inspectGlobals(`
    Object
    window.Object
  `)
  t.deepEqual(globals, [])
  t.end()
})

test('not picking up global ref', (t) => {
  const globals = inspectGlobals(`
    global
    global[key]
  `)
  t.deepEqual(globals, [])
  t.end()
})

test('ignore globalRef without property lookup', (t) => {
  const globals = inspectGlobals(`
    typeof window === undefined
  `)
  t.deepEqual(globals, [])
  t.end()
})