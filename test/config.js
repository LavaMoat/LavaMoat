const test = require('tape-promise').default(require('tape'))

const { createBundleFromRequiresArray } = require('./util')

// here we are providing an endowments only to a module deep in a dep graph
test('config - deep endow', async (t) => {
  const entries = [
    {
      'id': 1,
      'file': '/one.js',
      'source': "require('two');",
      'deps': { 'two': 2 },
      'entry': true
    },
    {
      'id': 2,
      'file': '/node_modules/two/index.js',
      'source': "require('three')",
      'deps': { 'three': 3 }
    },
    {
      'id': 3,
      'file': '/node_modules/three/index.js',
      'source': "window.postMessage('12345', '*')",
      'deps': {}
    }
  ]

  const config = {
    resources: {
      '<root>': {
        modules: {
          'two': true
        }
      },
      'two': {
        modules: {
          'three': true
        }
      },
      'three': {
        globals: {
          'window.postMessage': true
        }
      }
    }
  }

  const bundle = await createBundleFromRequiresArray(entries, { sesifyConfig: config })

  let testResult
  global.window = { postMessage: (message) => { testResult = message } }
  try {
    eval(bundle)
  } catch (err) {
    t.fail(`eval of bundle failed:\n${err.stack || err}`)
  }
  t.deepEqual(testResult, '12345')
})
