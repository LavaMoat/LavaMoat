const clone = require('clone')
const {
  createBundleFromRequiresArray,
  fnToCodeBlock,
  getTape,
} = require('./util')

const test = getTape()


test('circularDeps - multi-module circular deps dont inf loop', async (t) => {
  const files = [{
    // id must be full path
    id: './apple.js',
    file: './apple.js',
    deps: {
      'banana': './node_modules/banana/a.js',
    },
    source: fnToCodeBlock(function () {
      global.testResult = require('banana')
    }),
    entry: true
  }, {
    // non-entry
    id: './node_modules/banana/a.js',
    file: './node_modules/banana/a.js',
    deps: {
      './b': './node_modules/banana/b.js'
    },
    source: fnToCodeBlock(function () {
      module.exports = require('./b')
    })
  }, {
    // non-entry
    id: './node_modules/banana/b.js',
    file: './node_modules/banana/b.js',
    deps: {
      './a': './node_modules/banana/a.js'
    },
    source: fnToCodeBlock(function () {
      require('./a')
      module.exports = 42
    })
  }]
  const config = {
    resources: {
      "<root>": {
        "packages": {
          "banana": true,
        }
      },
    }
  }
  const bundle = await createBundleFromRequiresArray(clone(files), { config })

  delete global.testResult
  eval(bundle)
  const result = global.testResult

  t.equal(result, 42, 'expected result, did not error')
})
