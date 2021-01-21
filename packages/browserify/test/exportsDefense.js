'use strict'

const test = require('ava')
const {
  runSimpleOneTwo,
  runSimpleOneTwoSamePackage
} = require('./util')

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

//   t.is(thing.action(), true, 'Thing.prototype.action was not corrupted')
// })
