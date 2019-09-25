const test = require('tape')
const magicCopy = require('../src/magicCopy')()


test('attack - prevent module cache attack in proto chain', (t) => {
  
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

