"use strict"

const test = require('tape-promise').default(require('tape'))
const clone = require('clone')
const {
  runSimpleOneTwo,
  runSimpleOneTwoSamePackage,
} = require('./util')

test('exportsDefense - readOnly restrictions have override workaround fix', async (t) => {
  function defineOne () {
    const two = require('two')
    const one = Object.create(two)
    one.xyz = 2
    module.exports = one
  }
  function defineTwo () {
    module.exports = { xyz: 1 }
  }
  const one = await runSimpleOneTwo({ defineOne, defineTwo })

  t.equal(one.xyz, 2, 'should update the property correctly')
  t.equal(Object.getPrototypeOf(one).xyz, 1, 'should not update the prototype')
})

test('exportsDefense - indirectly imported package should be readOnly', async (t) => {
  function defineOne () {
    const Thing = require('two')
    module.exports = {
      create: () => new Thing()
    }
  }
  function defineTwo () {
    class Thing {}
    Thing.prototype.action = () => true
    module.exports = Thing
  }

  const one = await runSimpleOneTwoSamePackage({ defineOne, defineTwo })
  const thing = one.create()

  // corrupt prototype
  const thingProto = Reflect.getPrototypeOf(thing)
  try {
    thingProto.action = () => false
  } catch (err) {
    t.ok(err, 'encountered an expected error overriding the prototype')
  }

  t.equal(thing.action(), true, 'Thing.prototype.action was not corrupted')
})