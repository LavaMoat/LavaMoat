const { runInNewContext } = require('node:vm')
const browserify = require('browserify')
const pify = require('pify')
const { promises: fs } = require('node:fs')
const path = require('node:path')
const watchify = require('watchify')
const lavamoatPlugin = require('../src/index')
const { verifySourceMaps } = require('./sourcemaps')
const {
  createScenarioFromScaffold,
  prepareScenarioOnDisk,
  evaluateWithSourceUrl,
  createHookedConsole,
} = require('lavamoat-core/test/util.js')
const util = require('node:util')
const tmp = require('tmp-promise')
const { spawnSync } = require('node:child_process')
const execFile = util.promisify(require('node:child_process').execFile)

const WORKSPACE_ROOT = path.resolve(__dirname, '..', '..', '..')

const localLavaMoatDeps = {
  lavapack: '@lavamoat/lavapack',
  browserify: 'lavamoat-browserify',
  'lavamoat-node': 'lavamoat',
  core: 'lavamoat-core',
}

function overrideDepsWithLocalPackages(projectDir, log) {
  const localPkgPaths = Object.keys(localLavaMoatDeps).map((workspaceDirname) =>
    path.resolve(WORKSPACE_ROOT, 'packages', workspaceDirname)
  )

  // link all of the workspaces to the temp dir project. no need to unlink
  // first; this will overwrite any already-present links
  const res2 = spawnSync(
    'npm',
    ['install', '--ignore-scripts', ...Object.values(localPkgPaths)],
    { cwd: projectDir, encoding: 'utf8' }
  )
  if (res2.status !== 0) {
    const err = res2.stderr
    log({
      err,
      out: res2.stdout,
      status: res2.status,
    })
    throw new Error(err)
  }
}

async function createBundleFromEntry(path, pluginOpts = {}) {
  pluginOpts.policy = pluginOpts.policy || { resources: {} }
  const bifyOpts = Object.assign(
    {
      // inline sourcemaps
      debug: true,
    },
    lavamoatPlugin.args
  )
  const bundler = browserify([], bifyOpts)
  bundler.add(path)
  bundler.plugin(lavamoatPlugin, pluginOpts)
  return bundleAsync(bundler)
}

async function autoConfigForScenario({ scenario, log }) {
  log ??= console.error.bind(console)
  const copiedScenario = {
    ...scenario,
    opts: { ...scenario.opts, writeAutoPolicy: true },
  }
  const { policyDir } = await createBundleForScenario({
    scenario: copiedScenario,
    log,
  })
  const fullPath = path.join(policyDir, 'policy.json')
  const policy = await fs.readFile(fullPath, 'utf8')
  return JSON.parse(policy)
}

async function bundleAsync(bundler) {
  const src = await pify((cb) => bundler.bundle(cb))()
  return src.toString()
}

function createWatchifyBundler(pluginOpts) {
  const bundler = browserify([], {
    debug: true,
    cache: {},
    packageCache: {},
    plugin: [
      // poll option is needed to ensure the 'update' event is properly fired after the config override file changes. Without it, the firing behavior is unpredictable due to filesystem watch not always detecting the change.
      [watchify, { poll: true }],
      // add lavamoat after watchify
      [lavamoatPlugin, pluginOpts],
    ],
  })
  return bundler
}

function evalBundle(bundle, context) {
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

async function runBrowserify({
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

async function prepareBrowserifyScenarioOnDisk({ scenario, log }) {
  const { path: projectDir } = await tmp.dir()
  log ??= console.error.bind(console)
  scenario.dir = projectDir
  log(`created test project directory at "${projectDir}"`)
  const depsToInstall = ['browserify@^17']
  let runBrowserifyPath = `${__dirname}/fixtures/runBrowserify.js`

  // install must happen before link, otherwise npm will remove any linked packages upon install
  const installDevDepsResult = spawnSync(
    'npm',
    ['install', '--ignore-scripts', ...depsToInstall],
    { cwd: projectDir, encoding: 'utf8' }
  )

  if (installDevDepsResult.status !== 0) {
    const msg = `Error while installing devDeps:\n${installDevDepsResult.stderr}\npackages: ${depsToInstall}`
    throw new Error(msg)
  }
  log(`installed ${depsToInstall.join(', ')}`)

  overrideDepsWithLocalPackages(projectDir, log)

  // copy scenario files
  // we copy files first so that we dont attempt to install the immaginary deps
  const { policyDir } = await prepareScenarioOnDisk({
    scenario,
    projectDir,
    policyName: 'browserify',
  })
  // copy browserify build runner
  await fs.copyFile(
    runBrowserifyPath,
    path.join(projectDir, 'runBrowserify.js')
  )
  return { projectDir, policyDir }
}

async function createBundleForScenario({
  scenario,
  bundleWithPrecompiledModules = true,
  log,
}) {
  log ??= console.error.bind(console)
  let policy
  if (!scenario.dir) {
    const { projectDir, policyDir } = await prepareBrowserifyScenarioOnDisk({
      scenario,
      log,
    })
    scenario.dir = projectDir
    policy = policyDir
  } else {
    policy = path.join(scenario.dir, '/lavamoat/browserify/')
  }

  const {
    output: { stdout: bundle, stderr },
  } = await runBrowserify({ scenario, bundleWithPrecompiledModules })
  if (stderr.length) {
    log(stderr)
  }
  return { bundleForScenario: bundle, policyDir: policy }
}

async function runScenario({
  scenario,
  bundle,
  runWithPrecompiledModules = true,
  log,
}) {
  log ??= console.error.bind(console)
  if (!bundle) {
    const { bundleForScenario } = await createBundleForScenario({
      scenario,
      bundleWithPrecompiledModules: runWithPrecompiledModules,
      log,
    })
    bundle = bundleForScenario
    await fs.writeFile(path.join(scenario.dir, 'bundle.js'), bundle)
  }
  await verifySourceMaps({ bundle, log })
  const { hookedConsole, firstLogEventPromise } = createHookedConsole()
  Object.assign(scenario.context, { console: hookedConsole })
  evaluateWithSourceUrl('testBundle.js', bundle, scenario.context)
  const testResult = await firstLogEventPromise
  return testResult
}

function createBrowserifyScenarioFromScaffold(...args) {
  const scenario = createScenarioFromScaffold(...args)
  // ammend scenario to list browserify as a dependency
  const packageJsonFileObject = scenario.files['package.json']
  const packageJsonFileContentObj = JSON.parse(packageJsonFileObject.content)
  if (!packageJsonFileContentObj.devDependencies['browserify']) {
    packageJsonFileContentObj.devDependencies['browserify'] = '*'
  }
  packageJsonFileObject.content = JSON.stringify(
    packageJsonFileContentObj,
    null,
    2
  )
  return scenario
}

module.exports = {
  createBundleFromEntry,
  createWatchifyBundler,
  evalBundle,
  runScenario,
  createBundleForScenario,
  autoConfigForScenario,
  runBrowserify,
  bundleAsync,
  prepareBrowserifyScenarioOnDisk,
  createBrowserifyScenarioFromScaffold,
}
