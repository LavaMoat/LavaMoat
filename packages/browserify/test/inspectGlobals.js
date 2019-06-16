const test = require('tape')
const acornGlobals = require('acorn-globals')
const inspectGlobals = require('../src/inspectGlobals')

test('inspectGlobals - basic', (t) => {
  const globals = inspectGlobalsTest(`
    atob
  `)
  t.deepEqual(globals, ['atob'])
  t.end()
})

test('inspectGlobals - picking out properties on window', (t) => {
  const globals = inspectGlobalsTest(`
    window.location
  `)
  t.deepEqual(globals, ['location'])
  t.end()
})

test('inspectGlobals - picking out properties on global', (t) => {
  const globals = inspectGlobalsTest(`
    global.localStorage
  `)
  t.deepEqual(globals, ['localStorage'])
  t.end()
})

test('inspectGlobals - picking out properties on self', (t) => {
  const globals = inspectGlobalsTest(`
    self.WebSocket
  `)
  t.deepEqual(globals, ['WebSocket'])
  t.end()
})

test('inspectGlobals - not picking up properties from non-global self', (t) => {
  const globals = inspectGlobalsTest(`
    var self = {}
    self.localStorage
  `)
  t.deepEqual(globals, [])
  t.end()
})

test('inspectGlobals - not picking up programmatic property lookups', (t) => {
  const globals = inspectGlobalsTest(`
    window[key]
  `)
  t.deepEqual(globals, ['window'])
  t.end()
})

test('inspectGlobals - picking up programmatic property lookups + explicit', (t) => {
  const globals = inspectGlobalsTest(`
    window[key]
    window.location
  `)
  t.deepEqual(globals, ['location', 'window'])
  t.end()
})

test('inspectGlobals - not picking out userspace global', (t) => {
  const globals = inspectGlobalsTest(`
    xyz = true
  `)
  t.deepEqual(globals, [])
  t.end()
})

test('inspectGlobals - not picking out userspace global on globalRef', (t) => {
  const globals = inspectGlobalsTest(`
    global.xyz = true
  `)
  t.deepEqual(globals, [])
  t.end()
})

test('inspectGlobals - not picking up js language features', (t) => {
  const globals = inspectGlobalsTest(`
    Object
    window.Object
  `)
  t.deepEqual(globals, [])
  t.end()
})

test('inspectGlobals - not picking up global ref', (t) => {
  const globals = inspectGlobalsTest(`
    global
    global[key]
  `)
  t.deepEqual(globals, [])
  t.end()
})

test('inspectGlobals - ignore globalRef without property lookup', (t) => {
  const globals = inspectGlobalsTest(`
    typeof window === undefined
  `)
  t.deepEqual(globals, [])
  t.end()
})

test('inspectGlobals - get granular platform api', (t) => {
  const globals = inspectGlobalsTest(`
    document.createElement('blink')
    location.href
    navigator.userAgent
  `)
  t.deepEqual(globals, ['document.createElement', 'location.href', 'navigator.userAgent'])
  t.end()
})

test('inspectGlobals - get granular platform api when nested under global', (t) => {
  const globals = inspectGlobalsTest(`
    window.location.href
  `)
  t.deepEqual(globals, ['location.href'])
  t.end()
})

test('inspectGlobals - take platform api, up to computed', (t) => {
  const globals = inspectGlobalsTest(`
    document.body.children[imaginarySubkey]
    window.location.href[imaginarySubkey]
  `)
  t.deepEqual(globals, ['document.body.children', 'location.href'])
  t.end()
})

test('inspectGlobals - raise globals to highest used', (t) => {
  const globals = inspectGlobalsTest(`
    location.href
    location
    document.body.children
    document.body.children.indexOf
  `)
  t.deepEqual(globals, ['document.body.children', 'location'])
  t.end()
})

function inspectGlobalsTest (code) {
  return inspectGlobals(acornGlobals.parse(code))
}