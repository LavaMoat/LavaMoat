const test = require('ava')
const fs = require('fs')
const path = require('path')
const { createScenarioFromScaffold, prepareScenarioOnDisk } = require('lavamoat-core/test/util')

const {
  runScenario,
  runBrowserify
} = require('./util')

test('config - default config path is generated with autoconfig if path is not specified', async (t) => {
  const scenario = createScenarioFromScaffold({
    opts: {
      writeAutoConfig: true
    }
  })
  const { projectDir } = await prepareScenarioOnDisk({ scenario })
  const expectedPath = path.join(projectDir, 'lavamoat-config.json')

  t.falsy(fs.existsSync(expectedPath), 'Config file does not yet exist')

  await runBrowserify({ projectDir, scenario})

  t.truthy(fs.existsSync(expectedPath), 'Config file exists')
})

test('config - writes a proper config to a temp dir', async (t) => {
  const scenario = createScenarioFromScaffold({
    defineOne: () => {
      module.exports = require('three')
    },
    defineTwo: () => {
      module.exports = 555
    },
    defineThree: () => {
      module.exports = require('two')
    },
    opts: {
      writeAutoConfig: true
    }
  })
  const { projectDir } = await prepareScenarioOnDisk({ scenario })
  await runBrowserify({ projectDir, scenario})
  const testResult = await runScenario({ scenario, dir: projectDir })
  t.deepEqual(testResult, 555)
})

test('Config override is applied if not specified and already exists at default path', async (t) => {
  const scenario = createScenarioFromScaffold({
    defineOne: () => {
      module.exports = require('three')
    },
    defineTwo: () => {
      module.exports = 30
    },
    defineThree: () => {
      module.exports = require('two')
    },
    configOverride: {
    resources: {
      three: {
        packages: {
          two: true
        }
      }
    }
  }
  })
  const testResult = await runScenario({ scenario })
  t.is(testResult, 30)
})

test('Config - Applies writeAutoConfigDebug plugin option and dumps module object to disk', async (t) => {
  const scenario = createScenarioFromScaffold({
    opts: {
      writeAutoConfig: true,
      writeAutoConfigDebug: true
    }
  })
  const { projectDir } = await prepareScenarioOnDisk({ scenario })
  const expectedPath = path.join(projectDir, './module-data.json')

  t.falsy(fs.existsSync(expectedPath), 'Module data does not yet exist')

  await runBrowserify({ projectDir, scenario})

  t.truthy(fs.existsSync(expectedPath), 'Module data exists')
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