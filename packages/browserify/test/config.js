const test = require('ava')
const fs = require('fs')
const path = require('path')
const {
  createScenarioFromScaffold,
  prepareScenarioOnDisk,
  runAndTestScenario
} = require('lavamoat-core/test/util')

const {
  runScenario,
  runBrowserify
} = require('./util')

test('policy - default policy path is generated with autoconfig if path is not specified', async (t) => {
  const scenario = createScenarioFromScaffold({
    opts: {
      writeAutoPolicy: true
    },
    contextName: 'browserify'
  })
  const { projectDir, policyDir } = await prepareScenarioOnDisk({ scenario, policyName: 'browserify' })
  const expectedPath = path.join(policyDir, 'policy.json')
  scenario.dir = projectDir

  t.false(fs.existsSync(expectedPath), 'Config file does not yet exist')

  await runBrowserify({ scenario })

  t.true(fs.existsSync(expectedPath), 'Config file exists')
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
    },
    expectedResult: 30
  })
  await runAndTestScenario(t, scenario, runScenario)
})

test('Config - Applies writeAutoPolicyDebug plugin option and dumps module object to disk', async (t) => {
  const scenario = createScenarioFromScaffold({
    opts: {
      writeAutoPolicy: true,
      writeAutoPolicyDebug: true
    }
  })
  const { projectDir, policyDir } = await prepareScenarioOnDisk({ scenario, policyName: 'browserify' })
  const expectedPath = path.join(policyDir, 'policy-debug.json')
  scenario.dir = projectDir

  t.false(fs.existsSync(expectedPath), 'Module data does not yet exist')

  await runBrowserify({ scenario })

  t.true(fs.existsSync(expectedPath), 'Module data does not yet exist')
})

// this test is not written correctly, im disabling it for now
// it tests features we dont support:
// - automatic watchify writeAutoPolicy rebuilds when policy override is modified
// - it uses invalid policy values
// - it expects policy-override to be merged into the policy and then written to disk
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
//     writeAutoPolicy: true,
//   })

//   const overridePath = './lavamoat/policy-override.json'
//   const configPath = './lavamoat/policy.json'

//   await new Promise(resolve => setTimeout(resolve, 1000))

//   const configFileString = fs.readFileSync(configPath, 'utf8')

//   const overrideString = JSON.stringify(configDefault)
//   fs.writeFileSync(overridePath, overrideString)
//   await new Promise(resolve => bundler.once('update', () => resolve()))

//   await createBundleFromRequiresArray([], {})
//   const updatedConfigFileString = fs.readFileSync(configPath, 'utf8')
//   rimraf.sync('./lavamoat')

//   t.false(configFileString.includes('"three": 12345678'), 'original policy should not have updated content')
//   t.true(updatedConfigFileString.includes('"three": 12345678'), 'policy should be updated')
// })