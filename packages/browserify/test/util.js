const { runInNewContext } = require('vm')
const browserify = require('browserify')
const pify = require('pify')
const fs = require('fs')
const path = require('path')
const clone = require('clone')
const through2 = require('through2').obj
const mergeDeep = require('merge-deep')
const watchify = require('watchify')
const through = require('through2').obj
const pump = require('pump')
const dataToStream = require('from')
const { packageNameFromPath } = require('lavamoat-core')
const lavamoatPlugin = require('../src/index')
const { prepareScenarioOnDisk, evaluateWithSourceUrl, createHookedConsole } = require('lavamoat-core/test/util.js')
const util = require('util')
const execFile = util.promisify(require('child_process').execFile)
const noop = () => {}

module.exports = {
  createBundleFromEntry,
  createBundleFromRequiresArray,
  createBundleFromRequiresArrayPath,
  createWatchifyBundle,
  generateConfigFromFiles,
  fnToCodeBlock,
  testEntryAttackerVictim,
  runSimpleOneTwo,
  runSimpleOneTwoSamePackage,
  evalBundle,
  createBrowserifyFromRequiresArray,
  createSpy,
  getStreamResults,
  runScenario,
  createBundleForScenario,
  autoConfigForScenario,
  runBrowserify
}

async function createBundleFromEntry (path, pluginOpts = {}) {
  pluginOpts.policy = pluginOpts.policy || { resources: {} }
  const bundler = browserify([], lavamoatPlugin.args)
  bundler.add(path)
  bundler.plugin(lavamoatPlugin, pluginOpts)
  return bundleAsync(bundler)
}

async function createBundleFromRequiresArrayPath (path, pluginOpts) {
  const depsArray = require(path)
  return createBundleFromRequiresArray(depsArray, pluginOpts)
}

async function createBundleFromRequiresArray (files, pluginOpts) {
  const bundler = createBrowserifyFromRequiresArray({ files, pluginOpts })
  return bundleAsync(bundler)
}

// override browserify's module resolution to use the ( loadModuleData, resolveRelative ) handles
function overrideResolverHooks ({ bundler, loadModuleData, resolveRelative }) {
  const mdeps = bundler.pipeline.get('deps').get(0)
  mdeps.resolver = (id, parent, cb) => {
    const moduleId = resolveRelative(parent.id, id)
    const moduleData = loadModuleData(moduleId)
    const file = moduleData.file
    const pkg = null
    const fakePath = moduleData.file
    cb(null, file, pkg, fakePath)
  }
  mdeps.readFile = (path, id, pkg) => {
    const matchingFile = loadModuleData(path)
    // if found return stream
    if (matchingFile) return dataToStream([matchingFile.source])
    throw new Error(`LavaMoat test util - could not find file "${path}"`)
  }
}

function createResolverHooksFromFilesArray ({ files }) {
  return {
    loadModuleData,
    resolveRelative,
  }

  function loadModuleData (moduleId) {
    const moduleData = files.find(f => f.id === moduleId || f.file === moduleId)
    if (!moduleData) {
      throw new Error(`could not find "${moduleId}" in files:\n${files.map(f => f.id).join('\n')}`)
    }
    return moduleData
  }

  function resolveRelative (parentModuleId, requestedName) {
    let parentFileEntry
    try {
      parentFileEntry = loadModuleData(parentModuleId)
    } catch (_) {}
    const moduleId = parentFileEntry ? (parentFileEntry.deps[requestedName] || requestedName) : requestedName
    return moduleId
  }
}

function createBrowserifyFromRequiresArray ({ files: _files, pluginOpts = {} }) {
  const files = clone(_files)

  // empty bundle but inject modules at bundle time
  const bifyOpts = Object.assign({}, lavamoatPlugin.args)
  const bundler = browserify([], bifyOpts)
  bundler.plugin(lavamoatPlugin, pluginOpts)
  // instrument bundler to use custom resolver hooks
  const { loadModuleData, resolveRelative } = createResolverHooksFromFilesArray({ files })
  overrideResolverHooks({ bundler, loadModuleData, resolveRelative })
  
  // inject entry files into browserify pipeline
  const fileInjectionStream = through2(null, null, function (cb) {
    files
      .filter(file => file.entry)
      .reverse()
      .forEach(file => {
        // must explicitly specify entry field
        file.entry = file.entry || false
        this.push(file)
      })
    cb()
  })
  // add our file injector
  bundler.pipeline.get('record').unshift(fileInjectionStream)
  // replace lavamoat-browserify's packageData stream which normally reads from disk
  bundler.pipeline.get('emit-deps').shift()
  bundler.pipeline.get('emit-deps').unshift(through2(function (moduleData, _, cb) {
    try {
      const packageName = moduleData.package || packageNameFromPath(moduleData.file || moduleData.id) || '<root>'
      moduleData.packageName = packageName
      moduleData.package = packageName
    } catch (err) {
      return cb(err)
    }
    cb(null, moduleData)
  }))
  return bundler
}

async function generateConfigFromFiles ({ files }) {
  let pluginOpts
  const promise = new Promise((resolve) => {
    pluginOpts = { writeAutoPolicy: resolve }
  })

  const bundler = createBrowserifyFromRequiresArray({ files, pluginOpts })
  await bundleAsync(bundler)
  const config = await promise
  return config
}

async function autoConfigForScenario ({ scenario }) {
  const copiedScenario = {...scenario, opts: {...scenario.opts, writeAutoPolicy: true }}
  const { policyDir } = await createBundleForScenario({ scenario: copiedScenario})
  const fullPath = path.join(policyDir, 'policy.json')
  const config = fs.readFileSync(fullPath)
  return JSON.parse(config.toString())
}

async function bundleAsync (bundler) {
  const src = await pify(cb => bundler.bundle(cb))()
  return src.toString()
}

function fnToCodeBlock (fn) {
  return fn.toString().split('\n').slice(1, -1).join('\n')
}

async function createWatchifyBundle (pluginOpts) {
  const bundler = browserify([], {
    cache: {},
    packageCache: {},
    plugin: [
      [lavamoatPlugin, pluginOpts],
      // poll option is needed to ensure the 'update' event is properly fired after the config override file changes. Without it, the firing behavior is unpredictable due to filesystem watch not always detecting the change.
      [watchify, { poll: true }]
    ]
  })
  bundleAsync(bundler)
  return bundler
}

async function testEntryAttackerVictim (t, { defineAttacker, defineVictim }) {
  function defineEntry () {
    require('attacker')
    const result = require('victim').action()
    global.testResult.value = result
  }

  const depsArray = [
    {
      id: '/entry.js',
      file: '/entry.js',
      source: `(${defineEntry}).call(this)`,
      deps: {
        attacker: '/node_modules/attacker/index.js',
        victim: '/node_modules/victim/index.js'
      },
      entry: true
    },
    {
      id: '/node_modules/attacker/index.js',
      file: '/node_modules/attacker/index.js',
      source: `(${defineAttacker}).call(this)`,
      deps: {
        victim: '/node_modules/victim/index.js'
      }
    },
    {
      id: '/node_modules/victim/index.js',
      file: '/node_modules/victim/index.js',
      source: `(${defineVictim}).call(this)`,
      deps: {}
    }
  ]

  const policy = {
    resources: {
      '<root>': {
        packages: {
          attacker: true,
          victim: true
        }
      },
      attacker: {
        packages: {
          victim: true
        }
      }
    }
  }
  const bundle = await createBundleFromRequiresArray(depsArray, { policy })
  const testResult = evalBundle(bundle)
  t.is(testResult.value, false)
}

async function runSimpleOneTwo ({ defineRoot, defineOne, defineTwo, defineThree, config = {}, testGlobal }) {

  function _defineRoot () {
    global.testResult.value = require('one')
  }

  function _defineOne () {
    module.exports = require('two')
  }

  function _defineTwo () {
    module.exports = {
      value: 'this is module two'
    }
  }

  function _defineThree () {
    module.exports = {
      value: 'this is module three'
    }
  }

  const depsArray = [
    {
      id: '/entry.js',
      file: '/entry.js',
      source: `(${defineRoot || _defineRoot}).call(this)`,
      deps: {
        one: '/node_modules/one/index.js',
        two: '/node_modules/two/index.js'
      },
      entry: true
    },
    {
      id: '/node_modules/one/index.js',
      file: '/node_modules/one/index.js',
      source: `(${defineOne || _defineOne}).call(this)`,
      deps: {
        two: '/node_modules/two/index.js'
      }
    },
    {
      id: '/node_modules/two/index.js',
      file: '/node_modules/two/index.js',
      source: `(${defineTwo || _defineTwo}).call(this)`,
      deps: {}
    },
    {
      id: '/node_modules/three/index.js',
      file: '/node_modules/three/index.js',
      source: `(${defineThree || _defineThree}).call(this)`,
      deps: {}
    }
  ]

  const _config = mergeDeep({
    resources: {
      '<root>': {
        packages: {
          one: true
        }
      },
      one: {
        packages: {
          two: true
        }
      }
    }
  }, config)

  const bundle = await createBundleFromRequiresArray(depsArray, { policy: _config })
  const testResult = evalBundle(bundle, testGlobal)

  return testResult.value
}

async function runSimpleOneTwoSamePackage ({ defineRoot, defineOne, defineTwo, config = {}, testGlobal }) {
  function _defineRoot () {
    global.testResult.value = require('one')
  }

  const depsArray = [
    {
      id: '/entry.js',
      file: '/entry.js',
      source: `(${defineRoot || _defineRoot}).call(this)`,
      deps: {
        one: '/node_modules/dep/one.js',
        two: '/node_modules/dep/two.js'
      },
      entry: true
    },
    {
      id: '/node_modules/dep/one.js',
      file: '/node_modules/dep/one.js',
      source: `(${defineOne}).call(this)`,
      deps: {
        two: '/node_modules/dep/two.js'
      }
    },
    {
      id: '/node_modules/dep/two.js',
      file: '/node_modules/dep/two.js',
      source: `(${defineTwo}).call(this)`,
      deps: {}
    }
  ]

  const _config = mergeDeep({
    resources: {
      '<root>': {
        packages: {
          one: true
        }
      },
      one: {
        packages: {
          two: true
        }
      }
    }
  }, config)

  const bundle = await createBundleFromRequiresArray(depsArray, { policy: _config })
  const testResult = evalBundle(bundle, testGlobal)

  return testResult.value
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

function createSpy ({ onEach = noop, onEnd = noop }) {
  return through(
    (entry, _, cb) => { onEach(entry); cb() },
    (cb) => { onEnd(); cb() }
  )
}

async function getStreamResults (stream) {
  // get bundle results
  const results = []
  await pify(cb => {
    pump(
      stream,
      createSpy({ onEach: (entry) => { results.push(entry) } }),
      cb
    )
  })()
  return results
}

async function runBrowserify ({ scenario }) {
  const args = [JSON.stringify({
    entries: scenario.entries,
    opts: scenario.opts,
    policy: scenario.config,
    policyOverride: scenario.configOverride
  })]
  const paths = {
    normal: `${__dirname}/fixtures/runBrowserify.js`,
    factor: `${__dirname}/fixtures/runBrowserifyBundleFactor.js`
  }
  const browserifyPath = paths[scenario.type || 'normal']
  const output = await execFile(browserifyPath, args, { cwd: scenario.dir, maxBuffer: 8192 * 10000 })
  return { output }
}

async function createBundleForScenario ({ scenario }) {
  let policy
  if (!scenario.dir) {
    const { projectDir, policyDir } = await prepareScenarioOnDisk({ scenario, policyName: 'browserify' })
    scenario.dir = projectDir
    policy = policyDir
  } else {
    policy = path.join(scenario.dir, `/lavamoat/browserify/`)
  }
  
  const { output: { stdout: bundle } } = await runBrowserify({ scenario })
  return { bundleForScenario: bundle, policyDir: policy }
}

async function runScenario ({ scenario, bundle }) {
  if (!bundle) {
    const { bundleForScenario } = await createBundleForScenario({ scenario })
    bundle = bundleForScenario
  }
  const { hookedConsole, firstLogEventPromise } = createHookedConsole()
  evaluateWithSourceUrl('testBundlejs', bundle, mergeDeep({ console: hookedConsole }, scenario.context))
  const testResult = await firstLogEventPromise
  return testResult
}