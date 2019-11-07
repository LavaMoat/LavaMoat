const test = require('tape-promise').default(require('tape'))
const clone = require('clone')
const {
  createBundleFromRequiresArray,
  fnToCodeBlock,
} = require('./util')


test('exportsDefense - harden on class exports', async (t) => {
  const files = [{
    // id must be full path
    id: './apple.js',
    file: './apple.js',
    deps: {
      'banana': './node_modules/banana/index.js',
    },
    source: fnToCodeBlock(function () {
      const Banana = require("banana")
      // const b = new Banana()
      // b.color = 'green'
      global.testResult = Banana
      // Banana.xyz = true
    }),
    entry: true
  }, {
    // non-entry
    id: './node_modules/banana/index.js',
    file: './node_modules/banana/index.js',
    deps: {},
    source: fnToCodeBlock(function () {
      module.exports = class Banana {
        constructor () {
          this.color = 'yellow'
        }
      }
    })
  }]
  const lavamoatConfig = {
    resources: {
      "<root>": {
        "packages": {
          "banana": true,
        }
      },
      "banana": {
        "exportsDefense": "harden"
      }
    }
  }
  const bundle = await createBundleFromRequiresArray(clone(files), { lavamoatConfig })
  delete global.testResult
  eval(bundle)

  const Banana = global.testResult
  t.ok(Banana, 'got a result')
  const b = new Banana()
  t.equal(b.color, 'yellow', 'Banana instantiation worked')
  b.color = 'green'
  t.equal(b.color, 'green', 'Banana instance was mutable')
  try {
    Banana.xyz = true
    t.equal(Banana.xyz, undefined, 'Banana class remained unmutated')
  } catch (err) {
    t.pass('failed to mutate hardened Banana')
  }
})
