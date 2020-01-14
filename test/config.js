const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const tmp = require('tmp')

const {
  createBundleFromRequiresArray,
  getTape,
  evalBundle,
} = require('./util')

const test = getTape()

// here we are providing an endowments only to a module deep in a dep graph
test('config - deep endow', async (t) => {
  const entries = [
    {
      'id': '/one.js',
      'file': '/one.js',
      'source': "require('two')",
      'deps': { 'two': '/node_modules/two/index.js' },
      'entry': true,
    },
    {
      'id': '/node_modules/two/index.js',
      'file': '/node_modules/two/index.js',
      'source': "require('three')",
      'deps': { 'three': '/node_modules/three/index.js', },
    },
    {
      'id': '/node_modules/three/index.js',
      'file': '/node_modules/three/index.js',
      'source': "window.postMessage('12345', '*')",
      'deps': {},
    }
  ]

  const config = {
    resources: {
      '<root>': {
        packages: {
          'two': true
        }
      },
      'two': {
        packages: {
          'three': true
        }
      },
      'three': {
        globals: {
          'postMessage': true
        }
      }
    }
  }

  const bundle = await createBundleFromRequiresArray(entries, { config })

  let messageSentByTest
  const testGlobal = { postMessage: (message) => { messageSentByTest = message } }

  evalBundle(bundle, testGlobal)
  t.deepEqual(messageSentByTest, '12345')
})

// here we provide an illegal config value
test('config - dunder proto not allowed in globals path', async (t) => {
  const entries = [
    {
      'id': '/one.js',
      'file': '/one.js',
      'source': "/* empty */",
      'deps': {},
      'entry': true,
    },
  ]

  const config = {
    resources: {
      '<root>': {
        globals: {
          'window.__proto__': true,
        },
      },
    }
  }

  const bundle = await createBundleFromRequiresArray(entries, { config })

  try {
    evalBundle(bundle)
    t.fail('did not throw as expected')
  } catch (err) {
    t.ok(err.message.includes('"__proto__"'))
  }
})

test('config - default config path is generated with autoconfig if path is not specified', async (t) => {
  const tmpObj = tmp.dirSync()
  const execOpts = {
    cwd: tmpObj.name,
    stdio: 'inherit'
  }

  const expectedPath = path.join(tmpObj.name, 'lavamoat/lavamoat-config.json')
  const scriptPath = require.resolve('./runBrowserify')

  t.notOk(fs.existsSync(expectedPath), 'Config file does not yet exist')

  execSync(`node ${scriptPath}`, execOpts)

  t.ok(fs.existsSync(expectedPath), 'Config file exists')
})