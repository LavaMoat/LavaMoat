const browserify = require('browserify')
const pify = require('pify')
const clone = require('clone')
const through2 = require('through2').obj
const mergeDeep = require('merge-deep')
const tmp = require('tmp')

const sesifyPlugin = require('../src/index')


module.exports = {
  createBundleFromEntry,
  createBundleFromRequiresArray,
  createBundleFromRequiresArrayPath,
  generateConfigFromFiles,
  filesToConfigSource,
  fnToCodeBlock,
  testEntryAttackerVictim,
  runSimpleOneTwo,
  runSimpleOneTwoSamePackage,
  runAutoConfig,
}

async function createBundleFromEntry (path, pluginOpts) {
  const bundler = browserify([], sesifyPlugin.args)
  bundler.add(path)
  bundler.plugin(sesifyPlugin, pluginOpts)
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

function createBrowserifyFromRequiresArray ({ files, pluginOpts }) {
  // empty bundle but inject modules at bundle time
  const bifyOpts = Object.assign({}, sesifyPlugin.args)
  const bundler = browserify([], bifyOpts)
  bundler.plugin(sesifyPlugin, pluginOpts)

  // override browserify's module resolution
  const mdeps = bundler.pipeline.get('deps').get(0)
  mdeps.resolve = (id, parent, cb) => {
    const parentModule = files.find(f => f.id === parent.id)
    const moduleId = parentModule ? parentModule.deps[id] : id
    const moduleData = files.find(f => f.id === moduleId)
    if (!moduleData) {
      throw new Error(`could not find "${moduleId}" in files:\n${files.map(f => f.id).join('\n')}`)
    }
    const file = moduleData.file
    const pkg = null
    const fakePath = moduleData.file
    cb(null, file, pkg, fakePath)
  }

  // inject files into browserify pipeline
  const fileInjectionStream = through2(null, null, function (cb) {
    clone(files).reverse().forEach(file => {
      // must explicitly specify entry field
      file.entry = file.entry || false
      this.push(file)
    })
    cb()
  })
  bundler.pipeline.splice('record', 0, fileInjectionStream)

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
    pluginOpts = { autoConfig: resolve }
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
  return fn.toString().split('\n').slice(1,-1).join('\n')
}


async function testEntryAttackerVictim (t, { defineAttacker, defineVictim }) {

  function defineEntry () {
    require('attacker')
    const result = require('victim').action()
    global.testResult = result
  }

  const depsArray = [
    {
      'id': '/entry.js',
      'file': '/entry.js',
      'source': `(${defineEntry})()`,
      'deps': {
        'attacker': '/node_modules/attacker/index.js',
        'victim': '/node_modules/victim/index.js'
      },
      'entry': true
    },
    {
      'id': '/node_modules/attacker/index.js',
      'file': '/node_modules/attacker/index.js',
      'source': `(${defineAttacker})()`,
      'deps': {
        'victim': '/node_modules/victim/index.js'
      }
    },
    {
      'id': '/node_modules/victim/index.js',
      'file': '/node_modules/victim/index.js',
      'source': `(${defineVictim})()`,
      'deps': {}
    }
  ]

  const config = {
    "resources": {
      "<root>": {
        "packages": {
          "attacker": true,
          "victim": true,
        }
      },
      "attacker": {
        "packages": {
          "victim": true,
        }
      },
    }
  }
  const result = await createBundleFromRequiresArray(depsArray, { config })
  eval(result)
  t.equal(global.testResult, false)
}

async function runSimpleOneTwo ({ defineOne, defineTwo, config = {} }) {

  function defineEntry () {
    global.testResult = require('one')
  }

  const depsArray = [
    {
      'id': '/entry.js',
      'file': '/entry.js',
      'source': `(${defineEntry})()`,
      'deps': {
        'one': '/node_modules/one/index.js',
        'two': '/node_modules/two/index.js'
      },
      'entry': true
    },
    {
      'id': '/node_modules/one/index.js',
      'file': '/node_modules/one/index.js',
      'source': `(${defineOne})()`,
      'deps': {
        'two': '/node_modules/two/index.js'
      }
    },
    {
      'id': '/node_modules/two/index.js',
      'file': '/node_modules/two/index.js',
      'source': `(${defineTwo})()`,
      'deps': {}
    }
  ]

  const _config = mergeDeep({
    "resources": {
      "<root>": {
        "packages": {
          "one": true,
        }
      },
      "one": {
        "packages": {
          "two": true,
        }
      },
    }
  }, config)

  const result = await createBundleFromRequiresArray(depsArray, { lavamoatConfig: _config })
  delete global.testResult
  eval(result)

  return global.testResult
}

async function runSimpleOneTwoSamePackage({ defineOne, defineTwo, config = {} }) {

  function defineEntry() {
    global.testResult = require('one')
  }

  const depsArray = [
    {
      'id': '/entry.js',
      'file': '/entry.js',
      'source': `(${defineEntry})()`,
      'deps': {
        'one': '/node_modules/one/index.js',
        'two': '/node_modules/one/main.js'
      },
      'entry': true
    },
    {
      'id': '/node_modules/one/index.js',
      'file': '/node_modules/one/index.js',
      'source': `(${defineOne})()`,
      'deps': {
        'two': '/node_modules/one/main.js'
      }
    },
    {
      'id': '/node_modules/one/main.js',
      'file': '/node_modules/one/main.js',
      'source': `(${defineTwo})()`,
      'deps': {}
    }
  ]

  const _config = mergeDeep({
    "resources": {
      "<root>": {
        "packages": {
          "one": true,
        }
      },
      "one": {
        "packages": {
          "two": true,
        }
      },
    }
  }, config)

  const result = await createBundleFromRequiresArray(depsArray, { lavamoatConfig: _config })
  delete global.testResult
  eval(result)

  return global.testResult
}


async function runAutoConfig(t) {

  const config = {
    "resources": {
      "<root>": {
        "packages": {
          "one": true,
        }
      },
      "one": {
        "packages": {
          "two": true,
        }
      },
    }
  }

  const tmpObj = tmp.fileSync();

  const result = await createBundleFromRequiresArray([], {
    lavamoatConfig: config,
    writeAutoConfig: true,
    config: tmpObj.name,
  })

  eval(result)
  t.ok(result, true)
}