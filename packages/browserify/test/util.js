const { runInNewContext } = require('vm')
const browserify = require('browserify')
const pify = require('pify')
const { promises: fs } = require('fs')
const path = require('path')
const watchify = require('watchify')
const lavamoatPlugin = require('../src/index')
const { verifySourceMaps } = require('./sourcemaps')
const { createScenarioFromScaffold, prepareScenarioOnDisk, evaluateWithSourceUrl, createHookedConsole } = require('lavamoat-core/test/util.js')
const util = require('util')
const tmp = require('tmp-promise')
const { spawnSync } = require('child_process')
const execFile = util.promisify(require('child_process').execFile)
const limitConcurrency = require('throat')(1)

const localLavaMoatDeps = {
  lavapack: '@lavamoat/lavapack',
  browserify: 'lavamoat-browserify',
  node: 'lavamoat',
  core: 'lavamoat-core',
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

async function copyFolder(from, to, opts = {skip: []}) {
  await fs.mkdir(to, { recursive: true })
  const elements = await fs.readdir(from)
  for (const element of elements) {
    if (opts.skip.includes(element)) {
      continue
    }
    const f = path.join(from, element), t = path.join(to, element)
    const stat = await fs.lstat(f)
    if (stat.isFile()) {
      await fs.copyFile(f, t)
    } else {
      await copyFolder(f, t, opts)
    }
  }
}

function overrideDepsWithLocalPackages(projectDir) {
  for (const [dirName, name] of Object.entries(localLavaMoatDeps)) {
    const src = path.resolve(__dirname, '..', '..', dirName)
    spawnSync('yarn', ['unlink', name], { cwd: projectDir })
    const res = spawnSync('yarn', ['link'], { cwd: src })
    if (res.status !== 0) {
      const err = res.stderr.toString()
      console.error({
        dirName,
        name,
        err,
        out: res.stdout.toString(),
        status: res.status,
      })
      throw new Error(err)
    }
  }
  const res = spawnSync('yarn', ['link', ...Object.values(localLavaMoatDeps)], { cwd: projectDir })
  if (res.status !== 0) {
    const err = res.stderr.toString()
    console.error({
      err,
      out: res.stdout.toString(),
      status: res.status,
    })
    throw new Error(err)
  }
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
  const { policyDir } = await createBundleForScenario({ scenario: copiedScenario })
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
    ],
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

// const limited = require('throat')(2)

async function prepareBrowserifyScenarioOnDisk ({ scenario }) {
  const { path: projectDir } = await tmp.dir()
  scenario.dir = projectDir
  console.warn(`created test project directory at "${projectDir}"`)
  const depsToInstall = ['browserify@^17', 'lavamoat-browserify']
  let runBrowserifyPath = `${__dirname}/fixtures/runBrowserify.js`
  if (scenario.type === 'factor') {
    depsToInstall.push(
      'through2@^3',
      'vinyl-buffer@^1',
      'bify-package-factor@^1',
    )
    runBrowserifyPath = `${__dirname}/fixtures/runBrowserifyBundleFactor.js`
  }
  // yarn link workspace dependencies
  overrideDepsWithLocalPackages(projectDir)
  // limit concurrency so that yarn v1 doesnt break its own cache
  const installDevDepsResult = await limitConcurrency(async function () {
    return spawnSync('yarn', ['add','--network-concurrency 1', '--prefer-offline', '-D', ...depsToInstall], { cwd: projectDir })
  })
  if (installDevDepsResult.status !== 0) {
    const msg = `Error while installing devDeps:\n${installDevDepsResult.stderr.toString()}\npackages: ${depsToInstall}`
    throw new Error(msg)
  }
  console.warn('installed browserify + lavamoat plugin')
  // copy scenario files
  // we copy files first so that we dont attempt to install the immaginary deps
  const { policyDir } = await prepareScenarioOnDisk({ scenario, projectDir, policyName: 'browserify' })
  // copy browserify build runner
  const paths = {
    normal: `${__dirname}/fixtures/runBrowserify.js`,
    factor: `${__dirname}/fixtures/runBrowserifyBundleFactor.js`,
  }
  await fs.copyFile(runBrowserifyPath, path.join(projectDir, 'runBrowserify.js'))
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
    policy = path.join(scenario.dir, '/lavamoat/browserify/')
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
    await fs.writeFile(path.join(scenario.dir, 'bundle.js'), bundle)
  }
  // dont validate factored bundles
  if (scenario.type !== 'factor') {
    await verifySourceMaps({ bundle })
  }
  const { hookedConsole, firstLogEventPromise } = createHookedConsole()
  Object.assign(scenario.context, { console: hookedConsole })
  evaluateWithSourceUrl('testBundle.js', bundle, scenario.context)
  const testResult = await firstLogEventPromise
  return testResult
}

function createBrowserifyScenarioFromScaffold (...args) {
  const scenario = createScenarioFromScaffold(...args)
  // ammend scenario to list browserify as a dependency
  const packageJsonFileObject = scenario.files['package.json']
  const packageJsonFileContentObj = JSON.parse(packageJsonFileObject.content)
  if (!packageJsonFileContentObj.devDependencies['browserify']) {
    packageJsonFileContentObj.devDependencies['browserify'] = '*'
  }
  packageJsonFileObject.content = JSON.stringify(packageJsonFileContentObj, null, 2)
  return scenario
}
