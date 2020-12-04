const test = require('ava')
const { parse, inspectPrimordialAssignments, environmentTypes } = require('../src/index')

function inspectPrimordialAssignmentsTest (code) {
  return inspectPrimordialAssignments(parse(code))
}

test('inspectPrimordialAssignments - basic', (t) => {
  const results = inspectPrimordialAssignmentsTest(`
    'hello world'
  `)
  t.deepEqual(results, [])
  })

test('inspectPrimordialAssignments - assignment to toString on prototype', (t) => {
  const results = inspectPrimordialAssignmentsTest(`
    MyClass.prototype.toString = () => 'hello'
  `)
  t.deepEqual(results, [])
  })

test('inspectPrimordialAssignments - assignment to toString', (t) => {
  const results = inspectPrimordialAssignmentsTest(`
    exports.toString = () => 'hello'
  `)
  t.deepEqual(results, [])
  })

test('inspectPrimordialAssignments - assignment to frozen primordial', (t) => {
  const results = inspectPrimordialAssignmentsTest(`
    Array.prototype.bogoSort = () => 'hello'
  `)
  t.deepEqual(results.length, 1)
  })

test('inspectPrimordialAssignments - primordial potential false positive - instrinsic', (t) => {
  const results = inspectPrimordialAssignmentsTest(`
    window.Array === Array
  `)
  t.deepEqual(results, [])
  })

test('inspectPrimordialAssignments - primordial potential false positive - keyword', (t) => {
  const results = inspectPrimordialAssignmentsTest(`
    const args = Array.prototype.slice.call(arguments)
  `)
  t.deepEqual(results, [])
  })

test('inspectPrimordialAssignments - primordial modify property', (t) => {
  const results = inspectPrimordialAssignmentsTest(`
    Object.keys.extra = 'hello'
  `)
  t.deepEqual(results.length, 1)
  })

test('inspectPrimordialAssignments - primordial Error modify property', (t) => {
  const results = inspectPrimordialAssignmentsTest(`
    Error.prepareStackTrace = () => {}
  `)
  t.deepEqual(results.length, 1)
  })

test('inspectPrimordialAssignments - ensure shadowed references not counted - simple', (t) => {
  const results = inspectPrimordialAssignmentsTest(`
    function Promise () {}
    Promise.all = () => {}
  `)
  t.deepEqual(results.length, 0)
  })

test('inspectPrimordialAssignments - ensure shadowed references not counted - complex', (t) => {
  const results = inspectPrimordialAssignmentsTest(`
  Array.abc = true
  ;(function(){
    const Array = {}
    Array.xyz = true
    ;(function(){
      Array.ijk = true
    })()
  })()
  `)
  t.deepEqual(results.length, 1)
  })
