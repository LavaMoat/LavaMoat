const test = require('tape-promise').default(require('tape'))
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const tmp = require('tmp')
const mkdirp = require('mkdirp')
const rimraf = require('rimraf')

const {
  createBundleFromRequiresArray,
  generateConfigFromFiles,
  createWatchifyBundle
} = require('./util')

// here we are providing an endowments only to a module deep in a dep graph
test('config - deep endow', async (t) => {
  const entries = [
    {
      id: '/one.js',
      file: '/one.js',
      source: "require('two');",
      deps: { two: '/node_modules/two/index.js' },
      entry: true
    },
    {
      id: '/node_modules/two/index.js',
      file: '/node_modules/two/index.js',
      source: "require('three')",
      deps: { three: '/node_modules/three/index.js' }
    },
    {
      id: '/node_modules/three/index.js',
      file: '/node_modules/three/index.js',
      source: "window.postMessage('12345', '*')",
      deps: {}
    }
  ]

  const config = {
    resources: {
      '<root>': {
        packages: {
          two: true
        }
      },
      two: {
        packages: {
          three: true
        }
      },
      three: {
        globals: {
          postMessage: true
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
      id: '/one.js',
      file: '/one.js',
      source: '/* empty */',
      deps: {},
      entry: true
    }
  ]

  const config = {
    resources: {
      '<root>': {
        globals: {
          'window.__proto__': true
        }
      }
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
  const tmpObj = tmp.dirSync()
  const defaults = {
    cwd: tmpObj.name,
    stdio: 'inherit'
  }

  const expectedPath = path.join(tmpObj.name, 'lavamoat/lavamoat-config.json')
  const scriptPath = require.resolve('./fixtures/runBrowserifyAutoConfig')

  t.notOk(fs.existsSync(expectedPath), 'Config file does not yet exist')

  const buildProcess = execSync(`node ${scriptPath}`, defaults)

  t.ok(fs.existsSync(expectedPath), 'Config file exists')

  t.end()
})

test('config - writes a proper config to a temp dir', async (t) => {
  const entries = [
    {
      id: '/one.js',
      file: '/one.js',
      source: "require('two');",
      deps: { two: '/node_modules/two/index.js' },
      entry: true
    },
    {
      id: '/node_modules/two/index.js',
      file: '/node_modules/two/index.js',
      source: "require('three')",
      deps: { three: '/node_modules/three/index.js' }
    },
    {
      id: '/node_modules/three/index.js',
      file: '/node_modules/three/index.js',
      source: "window.postMessage('12345', '*')",
      deps: {}
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
          two: true
        }
      }
    }
  }
  const configOverride = {
    resources: {
      '<root>': {
        packages: {
          two: true
        }
      },
      two: {
        packages: {
          three: true
        }
      },
      three: {
        globals: {
          postMessage: true
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

  t.assert(bundle.includes('"three":true'), 'Applies override, provided as object')
  t.assert(stringBundle.includes('"three":true'), 'Applies override, provided as string')
  t.assert(functionBundle.includes('"three":true'), 'Applies override, provided as function')
  t.assert(configObjectBundle.includes('"three":true'), 'Applies override, primary config provided as object')
})

test('Config override is applied if not specified and already exists at default path', async (t) => {
  const config = {
    resources: {}
  }

  const configOverride = {
    resources: {
      '<root>': {
        packages: {
          two: true
        }
      },
      two: {
        packages: {
          three: 12345678
        }
      },
      three: {
        globals: {
          postMessage: true
        }
      }
    }
  }

  const tmpObj = tmp.dirSync()
  const configDir = path.join(tmpObj.name, './lavamoat')
  mkdirp.sync(configDir)

  const configPath = path.join(tmpObj.name, './lavamoat/lavamoat-config.json')
  fs.writeFileSync(configPath, JSON.stringify(config))
  const configOverridePath = path.join(tmpObj.name, './lavamoat/lavamoat-config-override.json')
  fs.writeFileSync(configOverridePath, JSON.stringify(configOverride))

  const scriptPath = require.resolve('./fixtures/runBrowserifyNoOpts')

  const buildProcess = execSync(`node ${scriptPath}`, { cwd: tmpObj.name })
  const outputString = buildProcess.toString()

  t.assert(outputString.includes('"three":12345678'), 'Applies override if exists but not specified')
})

// this test is not written correctly, im disabling it for now
// it tests features we dont support:
// - automatic watchify writeAutoConfig rebuilds when config override is modified
// - it uses invalid config values
// - it expects config-override to be merged into the config and then written to disk
// test('Config edits trigger re-bundle if using watchify', async (t) => {
//   const configDefault = {
//     resources: {
//       '<root>': {
//         packages: {
//           'two': true
//         }
//       },
//       'two': {
//         packages: {
//           'three': 12345678
//         }
//       }
//     }
//   }
//   const bundler = await createWatchifyBundle({
//     writeAutoConfig: true,
//   })

//   const overridePath = './lavamoat/lavamoat-config-override.json'
//   const configPath = './lavamoat/lavamoat-config.json'

//   await new Promise(resolve => setTimeout(resolve, 1000))

//   const configFileString = fs.readFileSync(configPath, 'utf8')

//   const overrideString = JSON.stringify(configDefault)
//   fs.writeFileSync(overridePath, overrideString)
//   await new Promise(resolve => bundler.once('update', () => resolve()))

//   await createBundleFromRequiresArray([], {})
//   const updatedConfigFileString = fs.readFileSync(configPath, 'utf8')
//   rimraf.sync('./lavamoat')

//   t.notOk(configFileString.includes('"three": 12345678'), 'original config should not have updated content')
//   t.ok(updatedConfigFileString.includes('"three": 12345678'), 'config should be updated')
// })

test("Config validation fails - invalid 'resources' key", async (t) => {
  const config = {
    resources: {
      '<root>': {
        packages: {
          two: true
        }
      },
      two: {
        packages: {
          three: true
        }
      }
    }
  }

  const configOverride = {
    resourceeees: {
      '<root>': {
        packages: {
          two: true
        }
      },
      two: {
        packages: {
          three: true
        },
        globals: {
          console: true
        }
      }
    }
  }

  testConfigValidator(configOverride, config, false, t)
})

test("Config validation fails - invalid 'packages' key", async (t) => {
  const config = {
    resources: {
      '<root>': {
        packages: {
          two: true
        }
      },
      two: {
        packages: {
          three: true
        }
      }
    }
  }

  const configOverride = {
    resources: {
      '<root>': {
        packaaaaages: {
          two: true
        }
      },
      two: {
        packages: {
          three: true
        },
        globals: {
          console: true
        }
      }
    }
  }

  testConfigValidator(configOverride, config, false, t)
})

test("Config validation fails - invalid 'globals' key", async (t) => {
  const config = {
    resources: {
      '<root>': {
        packages: {
          two: true
        }
      },
      two: {
        packages: {
          three: true
        }
      }
    }
  }

  const configOverride = {
    resources: {
      '<root>': {
        packages: {
          two: true
        }
      },
      two: {
        packages: {
          three: true
        },
        globalsssssss: {
          console: true
        }
      }
    }
  }

  testConfigValidator(configOverride, config, false, t)
})

test('Config validation fails - invalid global value', async (t) => {
  const config = {
    resources: {
      '<root>': {
        packages: {
          two: true
        }
      },
      two: {
        packages: {
          three: true
        }
      }
    }
  }

  const configOverride = {
    resources: {
      '<root>': {
        packages: {
          two: true
        }
      },
      two: {
        packages: {
          three: true
        },
        globals: {
          console: false
        }
      }
    }
  }

  testConfigValidator(configOverride, config, false, t)
})

test('Config validation passes - everything valid', async (t) => {
  const config = {
    resources: {
      '<root>': {
        packages: {
          two: true
        }
      },
      two: {
        packages: {
          three: true
        }
      }
    }
  }

  const configOverride = {
    resources: {
      '<root>': {
        packages: {
          two: true
        }
      },
      two: {
        packages: {
          three: true
        },
        globals: {
          console: 'write'
        }
      }
    }
  }

  testConfigValidator(configOverride, config, true, t)
})

async function testConfigValidator (configOverride, config, shouldBeValid, t) {
  try {
    await createBundleFromRequiresArray([], {
      config,
      configOverride
    })
    if (shouldBeValid) {
      t.pass('Does not throw')
    } else {
      t.fail('Should throw')
    }
  } catch (error) {
    if (shouldBeValid) {
      t.fail('Should not throw')
    } else {
      t.pass('Throws')
    }
  }
}

test('Config - Applies depsDump plugin option and dumps module object to disk', async (t) => {
  const tmpObj = tmp.dirSync()

  const defaults = {
    cwd: tmpObj.name,
    stdio: 'inherit'
  }

  const expectedPath = path.join(tmpObj.name, './deps-dump.json')
  const scriptPath = require.resolve('./fixtures/runBrowserifyAutoConfig')

  t.notOk(fs.existsSync(expectedPath), 'Deps Dump does not yet exist')

  execSync(`node ${scriptPath}`, defaults)

  t.ok(fs.existsSync(expectedPath), 'Deps Dump exists')
})