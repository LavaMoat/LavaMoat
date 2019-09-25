const test = require('tape')
const magicCopy = require('../src/magicCopy')()


test('magicCopy - ensure clean copy of obj props', (t) => {
  const a = {}
  const b = { a }

  const x = magicCopy(b)

  // obj not equal but deep equal
  t.notEqual(b, x)
  t.deepEqual(b, x)
  // prop not equal but deep equal
  t.notEqual(b.a, x.a)
  t.deepEqual(b.a, x.a)

  t.end()
})

test('magicCopy - ensure clean copy of obj props', (t) => {
  const a = { v: 1 }
  const b = { a }

  const x = magicCopy(b)
  x.a.v = 2

  // obj not equal but deep equal
  t.notEqual(b, x)
  t.notDeepEqual(b, x)
  // prop not equal but deep equal
  t.notEqual(b.a, x.a)
  t.notDeepEqual(b.a, x.a)

  t.end()
})

test('magicCopy - ensure no modification of copy', (t) => {
  const a = { b: () => true }

  const x = magicCopy(a)
  x.b = () => false

  // function was not modified
  t.equal(x.b(), false)
  t.equal(a.b(), true)

  t.end()
})

test('magicCopy - ensure clean copy of proto chain', (t) => {
  const a = {}
  const b = Object.create(a)

  const x = magicCopy(b)

  // obj not equal but deep equal
  t.notEqual(b, x)
  t.deepEqual(b, x)
  // proto not equal but deep equal
  const bp = Reflect.getPrototypeOf(b)
  const xp = Reflect.getPrototypeOf(x)
  t.notEqual(bp, xp)
  t.deepEqual(bp, xp)

  t.end()
})