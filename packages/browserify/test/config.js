const test = require('ava')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const tmp = require('tmp')
const mkdirp = require('mkdirp')
const rimraf = require('rimraf')
const { createScenarioFromScaffold } = require('lavamoat-core/test/util')

const {
  createBundleFromRequiresArray,
  generateConfigFromFiles,
  runSimpleOneTwo,
  evalBundle,
  runScenario
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

  let messageSentByTest
  const testGlobal = { postMessage: (message) => { messageSentByTest = message } }

  evalBundle(bundle, testGlobal)
  t.deepEqual(messageSentByTest, '12345')
})

// here we provide an illegal config value
test('config - dunder proto not allowed in globals path', async (t) => {

  const config = {
    resources: {
      'one': {
        globals: {
          'window.__proto__': true
        }
      }
    }
  }

  try {
    await runSimpleOneTwo({ config })
    t.fail('did not throw as expected')
  } catch (err) {
    t.truthy(err.message.includes('"__proto__"'))
  }
})

test('config - disable access to package', async (t) => {
  t.plan(1)

  // disable one's access to two
  const config = {
    resources: {
      one: {
        packages: {
          two: false
        }
      }
    }
  }

  try {
    await runSimpleOneTwo({ config })
    t.fail('should have encountered a fatal error')
  } catch (err) {
    t.truthy(
      err.message.includes('LavaMoat - required package not in whitelist'),
      'got expected error'
    )
  }

  })

test('config - default config path is generated with autoconfig if path is not specified', async (t) => {
  const { name: tempDir } = tmp.dirSync()
  const execOpts = {
    cwd: tempDir,
    stdio: 'inherit'
  }

  const expectedPath = path.join(tempDir, 'lavamoat-config.json')
  const scriptPath = require.resolve('./fixtures/runBrowserifyAutoConfig')

  t.falsy(fs.existsSync(expectedPath), 'Config file does not yet exist')

  execSync(`node ${scriptPath}`, execOpts)

  t.truthy(fs.existsSync(expectedPath), 'Config file exists')

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
  const filePath = path.join(tmpObj.name, 'lavamoat-config.json')
  const configDir = path.dirname(filePath)

  mkdirp.sync(configDir)
  fs.writeFileSync(filePath, JSON.stringify(config))
  const bundle = await createBundleFromRequiresArray([], { config: filePath })
  t.notThrows(() => evalBundle(bundle))
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
  const configFilePath = path.join(tmpObj.name, 'lavamoat-config.json')
  const overrideFilePath = path.join(tmpObj.name, 'lavamoat-config-override.json')
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
  const scenario = createScenarioFromScaffold({
    defineThree: () => {
      module.exports = require('two')
    },
    defineTwo: () => {
      module.exports = 30
    },
    defineOne: () => {
      module.exports = require('three')
    }
  })
  scenario.configOverride = {
    resources: {
      three: {
        packages: {
          two: true
        }
      }
    }
  }
  const testResult = await runScenario({ scenario })
  t.is(testResult, 30)

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

//   t.falsy(configFileString.includes('"three": 12345678'), 'original config should not have updated content')
//   t.truthy(updatedConfigFileString.includes('"three": 12345678'), 'config should be updated')
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

  await testConfigValidator(configOverride, config, false, t)
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

  await testConfigValidator(configOverride, config, false, t)
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

  await testConfigValidator(configOverride, config, false, t)
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

  await testConfigValidator(configOverride, config, false, t)
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

  await testConfigValidator(configOverride, config, true, t)
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

test('Config - Applies writeAutoConfigDebug plugin option and dumps module object to disk', async (t) => {
  const tmpObj = tmp.dirSync()

  const defaults = {
    cwd: tmpObj.name,
    stdio: 'inherit'
  }

  const expectedPath = path.join(tmpObj.name, './module-data.json')
  const scriptPath = require.resolve('./fixtures/runBrowserifyAutoConfig')

  t.falsy(fs.existsSync(expectedPath), 'Module data does not yet exist')

  execSync(`node ${scriptPath}`, defaults)

  t.truthy(fs.existsSync(expectedPath), 'Module data exists')
})