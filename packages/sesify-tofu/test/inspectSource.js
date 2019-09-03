const test = require('tape')
const { inspectSource } = require('../src/index')

test('fnToCodeBlock utility works', (t) => {
  const src = fnToCodeBlock(function() {
    var x = 1
  })

  t.equal(src, `    var x = 1`)
  t.end()
})

testInspect('detects global reads', {}, function() {
  var x = xyz
  (function(a){ return a })(abc)
}, {
  'xyz': 'read',
  'abc': 'read',
})

testInspect('doesnt detect "this"', {}, function() {
  const x = this
}, {})

testInspect('doesnt detect properties on "this"', {}, function() {
  this.xyz
}, {})

testInspect('detects reads on globalRefs', {
  globalRefs: ['zzz']
}, function() {
  const x = zzz.abc
}, {
  'abc': 'read',
})

testInspect('detects reads on multiple globalRefs', {
  globalRefs: ['a','b','c']
}, function() {
  const x = a.x + b.y * c.z
}, {
  'x': 'read',
  'y': 'read',
  'z': 'read',
})

testInspect('detects implicit global writes', {}, function() {
  xyz = true
}, {
  'xyz': 'write',
})

testInspect('detects implicit global writes with mixed usage', {}, function() {
  z = xyz
  xyz = (function(a){ return a })(abc)
}, {
  'xyz': 'write',
  'abc': 'read',
  'z': 'write',
})

testInspect('detects assignment to globalRefs', {
  globalRefs: ['zzz']
}, function() {
  zzz.abc = true
}, {
  'abc': 'write',
})

testInspect('detects assignment to globalRefs', {
  globalRefs: ['zzz']
}, function() {
  zzz.abc = xyz.abc
}, {
  'abc': 'write',
  'xyz.abc': 'read',
})

testInspect('not picking up assignments to non-global matching globalRef name', {
  globalRefs: ['xyz'],
}, function () {
  const xyz = {}
  xyz.abc
}, {})

testInspect('elevating computed property lookups to globalRef', {
  globalRefs: ['abc']
}, function(){
  const key = 'hello'
  abc[key]
}, {
  'abc': 'read'
})

testInspect('elevating computed property lookups to globalRef', {
  globalRefs: ['abc']
}, function(){
  const key = 'hello'
  abc.xyz.ijk[key]
}, {
  'xyz.ijk': 'read'
})

testInspect('picking up mixed explicit and computed property lookups', {
  globalRefs: ['window'],
}, function(){
  const key = 'hello'
  window[key]
  window.location
}, {
  'window': 'read',
  'location': 'read',
})

testInspect('not picking up js language features', {
  globalRefs: ['window'],  
}, function(){
  Object
  window.Object
}, {})

testInspect('ignore globalRef without property lookup', {
  globalRefs: ['window']
}, function () {
  typeof window === undefined
}, {})

testInspect('get granular platform api', {}, function () {
  document.createElement('blink')
  location.href
  navigator.userAgent
}, {
  'document.createElement': 'read',
  'location.href': 'read',
  'navigator.userAgent': 'read',
})

testInspect('get granular platform api when nested under global', {
  globalRefs: ['window']
}, function () {
  window.location.href
}, {
  'location.href': 'read'
})

testInspect('take platform api, up to computed', {
  globalRefs: ['window']
}, function () {
  const key = 'hello'
  document.body.children[key]
  window.location.href[key]
}, {
  'document.body.children': 'read',
  'location.href': 'read',
})

testInspect('raise globals to highest used', {}, function () {
  location.href
  location
  document.body.children
  document.body.children.indexOf
}, {
  'location': 'read',
  'document.body.children': 'read',
})

testInspect('read access to object implies write access to properties', {}, function () {
  const x = location
  location.href = 'website'
}, {
  'location': 'read',
})


function testInspect (label, opts, fn, expectedResultObj) {
  test(label, (t) => {
    const src = fnToCodeBlock(fn)
    const result = inspectSource(src, opts)
    const resultSorted = [...result.entries()].sort(sortBy(0))
    const expectedSorted = Object.entries(expectedResultObj).sort(sortBy(0))
  
    t.deepEqual(resultSorted, expectedSorted)
    t.end()
  })
}

function sortBy(key) {
  return (a,b) => {
    const vA = a[key], vB = b[key]
    if (vA === vB) return 0
    return vA > vB ? 1 : -1
  }
}

function fnToCodeBlock (fn) {
  return fn.toString().split('\n').slice(1,-1).join('\n')
}