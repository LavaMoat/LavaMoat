const test = require('tape-promise').default(require('tape'))
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const tmp = require('tmp')
const mkdirp = require('mkdirp')

const { 
  createBundleFromRequiresArray,
  generateConfigFromFiles
 } = require('./util')

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

  const bundle = await createBundleFromRequiresArray(entries, { config })

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

  const bundle = await createBundleFromRequiresArray(entries, { config })

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
  const tmpObj = tmp.dirSync();
  const defaults = {
    cwd: tmpObj.name,
    stdio: 'inherit' 
  };

  const expectedPath = path.join(tmpObj.name, 'lavamoat/lavamoat-config.json')
  const scriptPath = require.resolve('./fixtures/runBrowserifyAutoConfig')

  t.notOk(fs.existsSync(expectedPath), 'Config file does not yet exist')

  const buildProcess = execSync(`node ${scriptPath}`, defaults)

  t.ok(fs.existsSync(expectedPath), 'Config file exists')

  t.end()
})

test("config - writes a proper config to a temp dir", async (t) => {
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

  const tmpObj = tmp.dirSync()
  const config = await generateConfigFromFiles({ files: entries })
  const filePath = path.join(tmpObj.name, 'lavamoat/lavamoat-config.json')
  const configDir = path.dirname(filePath)

  mkdirp.sync(configDir)
  fs.writeFileSync(filePath, JSON.stringify(config))
  const bundle = await createBundleFromRequiresArray([], { config: filePath })
  t.doesNotThrow(() => eval(bundle))
})

test('Config - Applies config override', async (t) => {
  const config = {
    resources: {
      '<root>': {
        packages: {
          'two': true
        }
      },
    }
  }
  const configOverride = {
    resources: {
      '<root>': {
        packages: {
          'two': true
        }
      },
      'two': {
        packages: {
          'three': 12345678
        }
      },
      'three': {
        globals: {
          'postMessage': true
        }
      }
    }
  }
  const tmpObj = tmp.dirSync()
  const configFilePath = path.join(tmpObj.name, 'lavamoat/lavamoat-config.json')
  const overrideFilePath = path.join(tmpObj.name, 'lavamoat/lavamoat-override.json')
  const configDir = path.dirname(configFilePath)

  mkdirp.sync(configDir)
  fs.writeFileSync(configFilePath, JSON.stringify(config))
  fs.writeFileSync(overrideFilePath, JSON.stringify(configOverride))
  
  const bundle = await createBundleFromRequiresArray([], {
    config: configFilePath,
    configOverride
  })
  const stringBundle = await createBundleFromRequiresArray([], {
    config: configFilePath,
    configOverride: overrideFilePath
  })
  const functionBundle = await createBundleFromRequiresArray([], {
    config: configFilePath,
    configOverride: () => configOverride
  })
  const configObjectBundle = await createBundleFromRequiresArray([], {
    config,
    configOverride: () => configOverride
  })

  t.assert(bundle.includes('"three": 12345678'), "Applies override, provided as object")
  t.assert(stringBundle.includes('"three": 12345678'), "Applies override, provided as string")
  t.assert(functionBundle.includes('"three": 12345678'), "Applies override, provided as function")
  t.assert(configObjectBundle.includes('"three": 12345678'), "Applies override, primary config provided as object")
})

test("Config override is applied if not specified and already exists at default path", async (t) => {
  const tmpObj = tmp.dirSync();
  const defaults = {
    cwd: tmpObj.name,
  };

  const configOverride = {
    resources: {
      '<root>': {
        packages: {
          'two': true
        }
      },
      'two': {
        packages: {
          'three': 12345678
        }
      },
      'three': {
        globals: {
          'postMessage': true
        }
      }
    }
  }

  const configOverridePath = path.join(tmpObj.name, './lavamoat/lavamoat-config-override.json')
  const configOverrideDir = path.dirname(configOverridePath)
  mkdirp.sync(configOverrideDir)
  fs.writeFileSync(configOverridePath, JSON.stringify(configOverride))

  const scriptPath = require.resolve('./fixtures/runBrowserifyNoOpts')

  const buildProcess = execSync(`node ${scriptPath}`, defaults)
  const outputString = buildProcess.toString()

  t.assert(outputString.includes('"three": 12345678'), "Applies override if exists but not specified")
})
