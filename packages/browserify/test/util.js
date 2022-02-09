const { runInNewContext } = require('vm')
const browserify = require('browserify')
const pify = require('pify')
const { promises: fs } = require('fs')
const path = require('path')
const mergeDeep = require('merge-deep')
const watchify = require('watchify')
const lavamoatPlugin = require('../src/index')
const { verifySourceMaps } = require('./sourcemaps')
const { prepareScenarioOnDisk, evaluateWithSourceUrl, createHookedConsole } = require('lavamoat-core/test/util.js')
const util = require('util')
const tmp = require('tmp-promise')
const { spawnSync } = require('child_process')
const execFile = util.promisify(require('child_process').execFile)


module.exports = {
  createBundleFromEntry,
  createWatchifyBundler,
  evalBundle,
  runScenario,
  createBundleForScenario,
  autoConfigForScenario,
  runBrowserify,
  bundleAsync,
  prepareBrowserifyScenarioOnDisk
}

async function createBundleFromEntry (path, pluginOpts = {}) {
  pluginOpts.policy = pluginOpts.policy || { resources: {} }
  const bifyOpts = Object.assign({
    // inline sourcemaps
    debug: true,
  }, lavamoatPlugin.args)
  const bundler = browserify([], bifyOpts)
  bundler.add(path)
  bundler.plugin(lavamoatPlugin, pluginOpts)
  return bundleAsync(bundler)
}

async function autoConfigForScenario ({ scenario }) {
  const copiedScenario = {...scenario, opts: {...scenario.opts, writeAutoPolicy: true }}
  const { policyDir } = await createBundleForScenario({ scenario: copiedScenario})
  const fullPath = path.join(policyDir, 'policy.json')
  const policy = await fs.readFile(fullPath, 'utf8')
  return JSON.parse(policy)
}

async function bundleAsync (bundler) {
  const src = await pify(cb => bundler.bundle(cb))()
  return src.toString()
}

function createWatchifyBundler (pluginOpts) {
  const bundler = browserify([], {
    debug: true,
    cache: {},
    packageCache: {},
    plugin: [
      // poll option is needed to ensure the 'update' event is properly fired after the config override file changes. Without it, the firing behavior is unpredictable due to filesystem watch not always detecting the change.
      [watchify, { poll: true }],
      // add lavamoat after watchify
      [lavamoatPlugin, pluginOpts],
    ]
  })
  return bundler
}

function evalBundle (bundle, context) {
  const newContext = Object.assign({}, context)
  // ensure the context has a reference to the global (for node versions without globalThis)
  newContext.global = newContext
  // since you cant currently mutate the true globalThis from inside a compartment,
  // we provide a testResult object to be decorated by the test bundle
  newContext.testResult = {}
  // perform eval
  runInNewContext(bundle, newContext)
  // pull out test result value from context (not always used)
  return newContext.testResult
}

async function runBrowserify ({
  scenario,
  bundleWithPrecompiledModules = true,
}) {
  const lavamoatParams = {
    entries: scenario.entries,
    opts: {
      bundleWithPrecompiledModules,
      ...scenario.opts,
    },
    policy: scenario.config,
    policyOverride: scenario.configOverride,
  }
  const args = [JSON.stringify(lavamoatParams)]
  const browserifyPath = path.join(scenario.dir, 'runBrowserify.js')
  const output = await execFile(browserifyPath, args, {
    cwd: scenario.dir,
    env: {
      ...process.env,
      PLUGIN_PATH: path.join(__dirname, '..', 'src', 'index.js'),
    },
    maxBuffer: 8192 * 10000,
  })
  return { output }
}

async function prepareBrowserifyScenarioOnDisk ({ scenario }) {
  const { path: projectDir } = await tmp.dir()
  scenario.dir = projectDir
  // install browserify
  const result = spawnSync('yarn', ['add','-D','browserify@17'], { cwd: projectDir })
  if (result.status !== 0) {
    throw new Error(result.stderr.toString())
  }
  // copy scenario files
  const { policyDir } = await prepareScenarioOnDisk({ scenario, projectDir, policyName: 'browserify' })
  // copy browserify build runner
  const paths = {
    normal: `${__dirname}/fixtures/runBrowserify.js`,
    factor: `${__dirname}/fixtures/runBrowserifyBundleFactor.js`
  }
  const runnerPath = paths[scenario.type || 'normal']
  await fs.copyFile(runnerPath, path.join(projectDir, 'runBrowserify.js'))
  return { projectDir, policyDir }
}

async function createBundleForScenario ({
  scenario,
  bundleWithPrecompiledModules = true,
}) {
  let policy
  if (!scenario.dir) {
    const { projectDir, policyDir } = await prepareBrowserifyScenarioOnDisk({ scenario })
    scenario.dir = projectDir
    policy = policyDir
  } else {
    policy = path.join(scenario.dir, `/lavamoat/browserify/`)
  }
  
  const { output: { stdout: bundle, stderr } } = await runBrowserify({ scenario, bundleWithPrecompiledModules })
  if (stderr.length) {
    console.warn(stderr)
  }
  return { bundleForScenario: bundle, policyDir: policy }
}

async function runScenario ({
  scenario,
  bundle,
  runWithPrecompiledModules = true,
}) {
  if (!bundle) {
    const { bundleForScenario } = await createBundleForScenario({
      scenario,
      bundleWithPrecompiledModules: runWithPrecompiledModules,
    })
    bundle = bundleForScenario
  }
  // dont validate factored bundles
  if (scenario.type !== 'factor') {
    await verifySourceMaps({ bundle })
  }
  const { hookedConsole, firstLogEventPromise } = createHookedConsole()
  evaluateWithSourceUrl('testBundlejs', bundle, mergeDeep({ console: hookedConsole }, scenario.context))
  const testResult = await firstLogEventPromise
  return testResult
}