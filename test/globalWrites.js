const test = require('tape-promise').default(require('tape'))

const { createBundleFromRequiresArray } = require('./util')

// here we are providing an endowments only to a module deep in a dep graph
test('config - deep endow', async (t) => {
  const entries = [
    {
      'id': '/one.js',
      'file': '/one.js',
      'source': "global.testResult = require('two');",
      'deps': { 'two': '/node_modules/two/index.js' },
      'entry': true
    },
    {
      'id': '/node_modules/two/index.js',
      'file': '/node_modules/two/index.js',
      'source': `
        xyz = true
        module.exports = require('three')
      `,
      'deps': { 'three': '/node_modules/three/index.js', }
    },
    {
      'id': '/node_modules/three/index.js',
      'file': '/node_modules/three/index.js',
      'source': `
        module.exports = xyz
      `,
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
        globals: {
          'xyz': 'write',
        },
        modules: {
          'three': true
        },
      },
      'three': {
        globals: {
          'xyz': true
        }
      }
    }
  }

  const bundle = await createBundleFromRequiresArray(entries, { lavamoatConfig: config })

  let testResult
  try {
    eval(bundle)
    testResult = global.testResult
  } catch (err) {
    t.fail(`eval of bundle failed:\n${err.stack || err}`)
  }
  t.deepEqual(testResult, true)
})
