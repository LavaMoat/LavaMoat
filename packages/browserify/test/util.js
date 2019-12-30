const browserify = require('browserify')
const pify = require('pify')
const clone = require('clone')
const through2 = require('through2').obj
const mergeDeep = require('merge-deep')

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
}

async function createBundleFromEntry (path, lavamoatConfig) {
  const bundler = browserify([], sesifyPlugin.args)
  bundler.add(path)
  bundler.plugin(sesifyPlugin, lavamoatConfig)
  return bundleAsync(bundler)
}

async function createBundleFromRequiresArrayPath (path, lavamoatConfig) {
  const depsArray = require(path)
  return createBundleFromRequiresArray(depsArray, lavamoatConfig)
}

async function createBundleFromRequiresArray (files, lavamoatConfig) {
  const bundler = createBrowserifyFromRequiresArray({ files, lavamoatConfig })
  return bundleAsync(bundler)
}

function createBrowserifyFromRequiresArray ({ files, lavamoatConfig }) {
  // empty bundle but inject modules at bundle time
  const bifyOpts = Object.assign({}, sesifyPlugin.args)
  const bundler = browserify([], bifyOpts)
  bundler.plugin(sesifyPlugin, lavamoatConfig)

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
  let lavamoatConfig
  const promise = new Promise((resolve) => {
    lavamoatConfig = { autoConfig: resolve }
  })

  const bundler = createBrowserifyFromRequiresArray({ files, lavamoatConfig })
  await bundleAsync(bundler)
  const config = await promise
  return config
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
  const result = await createBundleFromRequiresArray(depsArray, { lavamoatConfig: config })
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