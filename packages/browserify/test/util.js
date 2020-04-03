const browserify = require('browserify')
const pify = require('pify')
const clone = require('clone')
const through2 = require('through2').obj
const mergeDeep = require('merge-deep')
const watchify = require('watchify')
const through = require('through2').obj
const pump = require('pump')
const dataToStream = require('from')
const lavamoatPlugin = require('../src/index')
const noop = () => {}

module.exports = {
  createBundleFromEntry,
  createBundleFromRequiresArray,
  createBundleFromRequiresArrayPath,
  createWatchifyBundle,
  generateConfigFromFiles,
  filesToConfigSource,
  fnToCodeBlock,
  testEntryAttackerVictim,
  runSimpleOneTwo,
  runSimpleOneTwoSamePackage,
  createBrowserifyFromRequiresArray,
  createSpy,
  getStreamResults
}

async function createBundleFromEntry (path, pluginOpts = {}) {
  pluginOpts.config = pluginOpts.config || {}
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
    .filter(file   => file.entry)
    .reverse()
    .forEach(file => {
      // must explicitly specify entry field
      file.entry = file.entry || false
      this.push(file)
    })
    cb()
  })

  bundler.pipeline.get('record').unshift(fileInjectionStream)

  return bundler
}

async function generateConfigFromFiles ({ files }) {
  const configSource = await filesToConfigSource({ files })
  const config = JSON.parse(configSource)
  return config
}

async function filesToConfigSource ({ files }) {
  let pluginOpts
  const promise = new Promise((resolve) => {
    pluginOpts = { writeAutoConfig: resolve }
  })

  const bundler = createBrowserifyFromRequiresArray({ files, pluginOpts })
  await bundleAsync(bundler)
  const configSource = await promise
  return configSource
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
    global.testResult = result
  }

  const depsArray = [
    {
      id: '/entry.js',
      file: '/entry.js',
      source: `(${defineEntry})()`,
      deps: {
        attacker: '/node_modules/attacker/index.js',
        victim: '/node_modules/victim/index.js'
      },
      entry: true
    },
    {
      id: '/node_modules/attacker/index.js',
      file: '/node_modules/attacker/index.js',
      source: `(${defineAttacker})()`,
      deps: {
        victim: '/node_modules/victim/index.js'
      }
    },
    {
      id: '/node_modules/victim/index.js',
      file: '/node_modules/victim/index.js',
      source: `(${defineVictim})()`,
      deps: {}
    }
  ]

  const config = {
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
  const result = await createBundleFromRequiresArray(depsArray, { config })
  eval(result)
  t.equal(global.testResult, false)
}

async function runSimpleOneTwo ({ defineRoot, defineOne, defineTwo, defineThree, config = {} }) {

  function _defineRoot () {
    global.testResult = require('one')
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
      source: `(${defineRoot || _defineRoot})()`,
      deps: {
        one: '/node_modules/one/index.js',
        two: '/node_modules/two/index.js'
      },
      entry: true
    },
    {
      id: '/node_modules/one/index.js',
      file: '/node_modules/one/index.js',
      source: `(${defineOne || _defineOne})()`,
      deps: {
        two: '/node_modules/two/index.js'
      }
    },
    {
      id: '/node_modules/two/index.js',
      file: '/node_modules/two/index.js',
      source: `(${defineTwo || _defineTwo})()`,
      deps: {}
    },
    {
      id: '/node_modules/three/index.js',
      file: '/node_modules/three/index.js',
      source: `(${defineThree || _defineThree})()`,
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

  const bundle = await createBundleFromRequiresArray(depsArray, { config: _config })
  delete global.testResult
  eval(bundle)

  return global.testResult
}

async function runSimpleOneTwoSamePackage ({ defineRoot, defineOne, defineTwo, config = {} }) {
  function _defineRoot () {
    global.testResult = require('one')
  }

  const depsArray = [
    {
      id: '/entry.js',
      file: '/entry.js',
      source: `(${defineRoot || _defineRoot})()`,
      deps: {
        one: '/node_modules/dep/one.js',
        two: '/node_modules/dep/two.js'
      },
      entry: true
    },
    {
      id: '/node_modules/dep/one.js',
      file: '/node_modules/dep/one.js',
      source: `(${defineOne})()`,
      deps: {
        two: '/node_modules/dep/two.js'
      }
    },
    {
      id: '/node_modules/dep/two.js',
      file: '/node_modules/dep/two.js',
      source: `(${defineTwo})()`,
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

  const result = await createBundleFromRequiresArray(depsArray, { config: _config })
  delete global.testResult
  eval(result)

  return global.testResult
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
