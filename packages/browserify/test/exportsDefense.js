'use strict'

const test = require('tape-promise').default(require('tape'))
const {
  runSimpleOneTwo,
  runSimpleOneTwoSamePackage
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

test('exportsDefense - doesnt explode on null/undefined exports', async (t) => {
  function defineOne () {
    module.exports = null
  }
  function defineTwo () {
    module.exports = undefined
  }
  const one = await runSimpleOneTwo({ defineOne, defineTwo })

  t.equal(one, null, 'should get the correct module.exports value')
})

test('exportsDefense - indirectly imported package should be readOnly', async (t) => {
  function defineRoot () {
    const one = require('one')
    const thing = one.create()
    const thingProto = Reflect.getPrototypeOf(thing)
    // attempt to corrupt prototype
    try {
      thingProto.action = () => false
    } catch (_) {}
    global.testResult = thing.action()
  }

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

  const testResult = await runSimpleOneTwoSamePackage({ defineRoot, defineOne, defineTwo })
  t.equal(testResult, true, 'Thing.prototype.action was not corrupted')
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
