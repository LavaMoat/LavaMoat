const test = require('tape')
const inspectGlobals = require('../src/inspectGlobals')

test('basic', (t) => {
  const globals = inspectGlobals(`
    atob
  `)
  t.deepEqual(globals, ['atob'])
  t.end()
})

test('picking out properties on window', (t) => {
  const globals = inspectGlobals(`
    window.location
  `)
  t.deepEqual(globals, ['location'])
  t.end()
})

test('picking out properties on global', (t) => {
  const globals = inspectGlobals(`
    global.localStorage
  `)
  t.deepEqual(globals, ['localStorage'])
  t.end()
})

test('picking out properties on self', (t) => {
  const globals = inspectGlobals(`
    self.WebSocket
  `)
  t.deepEqual(globals, ['WebSocket'])
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
  t.deepEqual(globals, ['window'])
  t.end()
})

test('picking up programmatic property lookups + explicit', (t) => {
  const globals = inspectGlobals(`
    window[key]
    window.location
  `)
  t.deepEqual(globals, ['location', 'window'])
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

test('get granular platform api', (t) => {
  const globals = inspectGlobals(`
    document.createElement('blink')
    location.href
    navigator.userAgent
  `)
  t.deepEqual(globals, ['document.createElement', 'location.href', 'navigator.userAgent'])
  t.end()
})

test('get granular platform api when nested under global', (t) => {
  const globals = inspectGlobals(`
    window.location.href
  `)
  t.deepEqual(globals, ['location.href'])
  t.end()
})

test('take platform api, up to computed', (t) => {
  const globals = inspectGlobals(`
    document.body.children[imaginarySubkey]
    window.location.href[imaginarySubkey]
  `)
  t.deepEqual(globals, ['document.body.children', 'location.href'])
  t.end()
})

test('raise globals to highest used', (t) => {
  const globals = inspectGlobals(`
    location.href
    location
    document.body.children
    document.body.children.indexOf
  `)
  t.deepEqual(globals, ['document.body.children', 'location'])
  t.end()
})
