const test = require('tape')
const { inspectSource } = require('../src/index')

test('fnToCodeBlock utility works', (t) => {
  const src = fnToCodeBlock(() => {
    1 + 2 + 3
  })

  t.equal(src, '(() => {\n    1 + 2 + 3\n  })()')
  t.end()
})

testInspect('detects global reads', {}, () => {
  const x = xyz
  (function (a) { return a })(abc)
}, {
  xyz: 'read',
  abc: 'read'
})

testInspect('doesnt detect "this"', {}, () => {
  const x = this
}, {})

testInspect('doesnt detect properties on "this"', {}, () => {
  this.xyz
}, {})

testInspect('detects reads on globalRefs', {
  globalRefs: ['zzz']
}, () => {
  const x = zzz.abc
}, {
  abc: 'read'
})

testInspect('detects reads on multiple globalRefs', {
  globalRefs: ['a', 'b', 'c']
}, () => {
  const x = a.x + b.y * c.z
}, {
  x: 'read',
  y: 'read',
  z: 'read'
})

testInspect('detects implicit global writes', {}, () => {
  xyz = true
}, {
  xyz: 'write'
})

testInspect('detects implicit global writes with mixed usage', {}, () => {
  z = xyz
  xyz = (function (a) { return a })(abc)
}, {
  xyz: 'write',
  abc: 'read',
  z: 'write'
})

testInspect('detects assignment to property on globalRefs', {
  globalRefs: ['zzz']
}, () => {
  zzz.abc = true
}, {
  abc: 'write'
})

testInspect('never suggest access to full globalRef', {
  globalRefs: ['zzz']
}, () => {
  const x = zzz
}, {})

testInspect('detects assignment to property on globalRefs', {
  globalRefs: ['zzz']
}, () => {
  zzz.abc = xyz.abc
}, {
  abc: 'write',
  'xyz.abc': 'read'
})

testInspect('not picking up assignments to non-global matching globalRef name', {
  globalRefs: ['xyz']
}, () => {
  const xyz = {}
  xyz.abc
}, {})

testInspect('elevating computed property lookups to globalRef', {
  globalRefs: ['abc']
}, () => {
  const key = 'hello'
  abc.xyz[key]
}, {
  xyz: 'read'
})

testInspect('elevating computed property lookups to globalRef', {
  globalRefs: ['abc']
}, () => {
  const key = 'hello'
  abc.xyz.ijk[key]
}, {
  'xyz.ijk': 'read'
})

testInspect('picking up mixed explicit and computed property lookups', {
  globalRefs: ['window']
}, () => {
  const key = 'hello'
  window.location[key]
  window.location.href
}, {
  location: 'read'
})

testInspect('not picking up js language features', {
  globalRefs: ['window']
}, () => {
  Object
  window.Object
}, {})

testInspect('ignore globalRef without property lookup', {
  globalRefs: ['window']
}, () => {
  typeof window === undefined
}, {})

testInspect('get granular platform api', {}, () => {
  document.createElement('blink')
  location.href
  navigator.userAgent
}, {
  'document.createElement': 'read',
  'location.href': 'read',
  'navigator.userAgent': 'read'
})

testInspect('get granular platform api when nested under global', {
  globalRefs: ['window']
}, () => {
  window.location.href
}, {
  'location.href': 'read'
})

testInspect('take platform api, up to computed', {
  globalRefs: ['window']
}, () => {
  const key = 'hello'
  document.body.children[key]
  window.location.href[key]
}, {
  'document.body.children': 'read',
  'location.href': 'read'
})

testInspect('raise globals to highest used', {}, () => {
  location.href
  location
  document.body.children
  document.body.children.indexOf
}, {
  location: 'read',
  'document.body.children': 'read'
})

testInspect('correctly finds deep "process.env" reference', {}, () => {
  process.env.READABLE_STREAM === 'disable'
}, {
  'process.env.READABLE_STREAM': 'read',
})

testInspect('read access to object implies write access to properties', {}, () => {
  const x = location
  location.href = 'website'
}, {
  location: 'read'
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

function sortBy (key) {
  return (a, b) => {
    const vA = a[key]; const vB = b[key]
    if (vA === vB) return 0
    return vA > vB ? 1 : -1
  }
}

function fnToCodeBlock (fn) {
  return `(${fn})()`
}
