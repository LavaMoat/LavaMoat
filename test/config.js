const test = require('tape-promise').default(require('tape'))
const fs = require('fs')
const path = require('path')
const { spawn, execSync } = require('child_process')
const tmp = require('tmp')

const { createBundleFromRequiresArray } = require('./util')

// here we are providing an endowments only to a module deep in a dep graph
test('config - deep endow', async (t) => {
  const entries = [
    {
      'id': '/one.js',
      'file': '/one.js',
      'source': "require('two');",
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

  const bundle = await createBundleFromRequiresArray(entries, { lavamoatConfig: config })

  let testResult
  global.postMessage = (message) => { testResult = message }
  try {
    eval(bundle)
  } catch (err) {
    t.fail(`eval of bundle failed:\n${err.stack || err}`)
  }
  t.deepEqual(testResult, '12345')
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

  const bundle = await createBundleFromRequiresArray(entries, { lavamoatConfig: config })

  let testResult
  global.postMessage = (message) => { testResult = message }
  try {
    eval(bundle)
    t.fail('did not throw as expected')
  } catch (err) {
    t.ok(err.message.includes('"__proto__"'))
  }
})

test('config - default config path is generated with autoconfig if path is not specified', async (t) => {
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
      },
    }
  }

  const tmpObj = tmp.dirSync({ keep: true });
  const defaults = {
    cwd: tmpObj.name,
  };

  const expectedPath = path.join(tmpObj.name, 'lavamoat/lavamoat-config.json')
  const scriptPath = require.resolve('./runBrowserify')

  t.throws(() => fs.accessSync(expectedPath), 'Config file does not yet exist')

  const buildProcess = execSync(`node ${scriptPath}`, defaults)

  t.doesNotThrow(() => fs.accessSync(expectedPath), 'Config file exists')
})
