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

// I'm not sure this is a problem we should solve
// test('exportsDefense - parent moduleExports is mutable before moduleInit completes', async (t) => {
//   function defineOne () {
//     const two = require('two')
//     class Thing {
//       action () { return true }
//     }
//     // use some utility to enhance your class definition
//     two(new Thing())
//     module.exports = Thing
//     // Thing isnt protected until after this moduleInitializer completes
//   }
//   function defineTwo () {
//     module.exports = (someClass) => {
//       someClass.prototype.action = () => false
//     }
//   }

//   const Thing = await runSimpleOneTwo({ defineOne, defineTwo })
//   const thing = new Thing()

//   t.equal(thing.action(), true, 'Thing.prototype.action was not corrupted')
// })