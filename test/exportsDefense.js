"use strict"

const test = require('tape-promise').default(require('tape'))
const clone = require('clone')
const {
  runSimpleOneTwo,
  createBundleFromRequiresArray,
  fnToCodeBlock,
} = require('./util')

// harden exportsDefense removed
// test('exportsDefense - harden on class exports', async (t) => {
//   const files = [{
//     // id must be full path
//     id: './apple.js',
//     file: './apple.js',
//     deps: {
//       'banana': './node_modules/banana/index.js',
//     },
//     source: fnToCodeBlock(function () {
//       const Banana = require("banana")
//       // const b = new Banana()
//       // b.color = 'green'
//       global.testResult = Banana
//       // Banana.xyz = true
//     }),
//     entry: true
//   }, {
//     // non-entry
//     id: './node_modules/banana/index.js',
//     file: './node_modules/banana/index.js',
//     deps: {},
//     source: fnToCodeBlock(function () {
//       module.exports = class Banana {
//         constructor () {
//           this.color = 'yellow'
//         }
//       }
//     })
//   }]
//   const lavamoatConfig = {
//     resources: {
//       "<root>": {
//         "packages": {
//           "banana": true,
//         }
//       },
//       "banana": {
//         "exportsDefense": "harden"
//       }
//     }
//   }
//   const bundle = await createBundleFromRequiresArray(clone(files), { lavamoatConfig })
//   delete global.testResult
//   eval(bundle)

//   const Banana = global.testResult
//   t.ok(Banana, 'got a result')
//   const b = new Banana()
//   t.equal(b.color, 'yellow', 'Banana instantiation worked')
//   b.color = 'green'
//   t.equal(b.color, 'green', 'Banana instance was mutable')
//   try {
//     Banana.xyz = true
//     t.equal(Banana.xyz, undefined, 'Banana class remained unmutated')
//   } catch (err) {
//     t.pass('failed to mutate hardened Banana')
//   }
// })

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