const test = require('tape-promise').default(require('tape'))
const createShadowingProxy = require('../src/shadowingProxy')

test('shadowingProxy - basic obj', async (t) => {
  const orig = { a: 1 }
  const copy = createShadowingProxy(orig)
  orig.b = 2
  copy.a = 3
  t.deepEqual(orig, { a: 1, b: 2 })
  t.deepEqual(copy, { a: 3, b: 2 })
})

test('shadowingProxy - obj delete', async (t) => {
  const orig = { a: 1, b: 2 }
  const copy = createShadowingProxy(orig)
  delete copy.b
  t.deepEqual(orig, { a: 1, b: 2 })
  t.deepEqual(copy, { a: 1 })
})

test('shadowingProxy - deep obj', async (t) => {
  const orig = { a: { b: 1 } }
  const copy = createShadowingProxy(orig)
  copy.a.b = 2
  t.deepEqual(orig, { a: { b: 1 } }, 'original should NOT be changed')
  t.deepEqual(copy, { a: { b: 2 } }, 'copy should be changed')
})

test('shadowingProxy - fn with props', async (t) => {
  const orig = () => 42
  orig.a = 100
  const copy = createShadowingProxy(orig)
  t.deepEqual(orig(), 42)
  t.deepEqual(copy(), 42)
  t.deepEqual(orig.a, 100)
  t.deepEqual(copy.a, 100)
})

test('shadowingProxy - deep fn with props', async (t) => {
  const orig = { a: () => 42 }
  orig.a.b = 100
  const copy = createShadowingProxy(orig)
  t.deepEqual(orig.a(), 42)
  t.deepEqual(copy.a(), 42)
  t.deepEqual(orig.a.b, 100)
  t.deepEqual(copy.a.b, 100)
})

test('shadowingProxy - deep fn with this ref', async (t) => {
  const orig = { a: function () { return this.b }, b: 123 }
  const copy = createShadowingProxy(orig)
  t.deepEqual(orig.a(), 123)
  t.deepEqual(copy.a(), 123)
  t.deepEqual(orig.b, 123)
  t.deepEqual(copy.b, 123)
})

test('shadowingProxy - deep fn and modify the this ref', async (t) => {
  const orig = { a: function () { return this.b = 456 }, b: 123 }
  const copy = createShadowingProxy(orig)

  t.deepEqual(copy.a(), 456)
  t.deepEqual(orig.b, 123)
  t.deepEqual(copy.b, 456)
})

test('shadowingProxy - class', async (t) => {
  const Orig = class {
    constructor () { this.b = 123 }
    a () { return this.b = 456 }
  }
  const Copy = createShadowingProxy(Orig)
  testClasses(t, Orig, Copy)
})

test('shadowingProxy - deep class', async (t) => {
  const origWrapper = { A: class {
      constructor () { this.b = 123 }
      a () { return this.b = 456 }
    }
  }
  const copyWrapper = createShadowingProxy(origWrapper)
  testClasses(t, origWrapper.A, copyWrapper.A)
})

test('shadowingProxy - fn class', async (t) => {
  const Orig = function () { this.b = 123; console.log('constructor -> ', this) }
  Orig.prototype.a = function () { console.log('a -> this', this, !!this.b); return this.b = 456 }
  const Copy = createShadowingProxy(Orig)
  testClasses(t, Orig, Copy)
})

test('shadowingProxy - deep fn class', async (t) => {
  const origWrapper = { A: function () { this.b = 123 } }
  origWrapper.A.prototype.a = function () { return this.b = 456 }
  const copyWrapper = createShadowingProxy(origWrapper)
  testClasses(t, origWrapper.A, copyWrapper.A)
})


function testClasses (t, Orig, Copy) {
  global.COPY = Copy
  const orig = new Orig()
  console.log('==== start instantiate Copy')
  const copy = new Copy()
  console.log('==== end instantiate Copy')

  t.deepEqual(!!orig.a, true, 'orig has a')
  t.deepEqual(!!orig.__proto__.a, true, 'orig proto has a')
  t.deepEqual(!!copy.a, true, 'copy has a')
  console.log('==== check proto a')
  t.deepEqual(!!copy.__proto__.a, true, 'copy proto has a')

  t.deepEqual(orig.constructor, Orig, 'orig prototype match')
  // t.deepEqual(copy.constructor, Copy, 'copy prototype match')

  // // this is fucking mysterious
  // console.log('=orig', global.DEBUG[orig])
  // console.log('=copy', global.DEBUG[copy])

  t.deepEqual(orig.b, 123)
  t.deepEqual(copy.b, 123)
  
  console.log('===== begin a lookup and call')
  t.deepEqual(copy.a(), 456)
  console.log('===== end a lookup and call')

  t.deepEqual(copy.b, 456, `copy's b should be updated`)
  t.deepEqual(orig.b, 123, `orig's b should be unchanged`)
  
  t.deepEqual(orig.a(), 456)
  t.deepEqual(orig.b, 456)
}
