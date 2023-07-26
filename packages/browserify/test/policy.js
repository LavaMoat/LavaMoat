const test = require('ava')
const fs = require('fs')
const path = require('path')
const {
  createScenarioFromScaffold,
  runAndTestScenario,
} = require('lavamoat-core/test/util')

const {
  runScenario,
  runBrowserify,
  createWatchifyBundler,
  prepareBrowserifyScenarioOnDisk,
} = require('./util')

test('policy - default policy path is generated with autoconfig if path is not specified', async (t) => {
  const scenario = createScenarioFromScaffold({
    opts: {
      writeAutoPolicy: true,
    },
    contextName: 'browserify',
  })
  const { policyDir } = await prepareBrowserifyScenarioOnDisk({ scenario })
  const expectedPath = path.join(policyDir, 'policy.json')

  t.false(fs.existsSync(expectedPath), 'Policy file does not yet exist')

  await runBrowserify({ scenario })

  t.true(fs.existsSync(expectedPath), 'Policy file exists')
})

test('Policy is applied if not specified and already exists at default path', async (t) => {
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
    config: {
      resources: {
        three: {
          packages: {
            two: true,
          },
        },
      },
    },
    expectedResult: 30,
  })
  await runAndTestScenario(t, scenario, runScenario)
})

test('Policy - Applies writeAutoPolicyDebug plugin option and dumps module object to disk', async (t) => {
  const scenario = createScenarioFromScaffold({
    opts: {
      writeAutoPolicy: true,
      writeAutoPolicyDebug: true,
    },
  })
  const { policyDir } = await prepareBrowserifyScenarioOnDisk({ scenario })
  const expectedPath = path.join(policyDir, 'policy-debug.json')

  t.false(fs.existsSync(expectedPath), 'Module data does not yet exist')

  await runBrowserify({ scenario })

  t.true(fs.existsSync(expectedPath), 'Module data does not yet exist')
})

test('Policy - watchify listens for policy file changes', async (t) => {
  const scenario = createScenarioFromScaffold({
    opts: {
      writeAutoPolicy: true,
    },
  })
  const { projectDir, policyDir } = await prepareBrowserifyScenarioOnDisk({ scenario })
  await runBrowserify({ scenario })

  const watchedFiles = []
  const bundler = createWatchifyBundler({ projectRoot: projectDir, policyName: 'browserify' })
  bundler.on('file', (file) => {
    watchedFiles.push(file)
  })
  // need to wait a tick to get file events
  await new Promise((resolve) => setTimeout(resolve))
  const relativeFiles = watchedFiles.map(file => path.relative(policyDir, file)).sort()
  t.deepEqual(relativeFiles, [
    'policy-override.json',
    'policy.json',
  ])
})

// this test is not written correctly, im disabling it for now
// it tests features we dont support:
// - automatic watchify writeAutoPolicy rebuilds when policy override is modified
//   - hey, we support this now
// - it uses invalid policy values
// - it expects policy-override to be merged into the policy and then written to disk
// test('Policy edits trigger re-bundle if using watchify', async (t) => {
//   const configDefault = {
//     resources: {
//       '$root$': {
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
//   const updatedPolicyFileString = fs.readFileSync(configPath, 'utf8')
//   rimraf.sync('./lavamoat')

//   t.false(configFileString.includes('"three": 12345678'), 'original policy should not have updated content')
//   t.true(updatedPolicyFileString.includes('"three": 12345678'), 'policy should be updated')
// })
