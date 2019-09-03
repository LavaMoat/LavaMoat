const browserify = require('browserify')
const pify = require('pify')
const clone = require('clone')
const through2 = require('through2').obj

const sesifyPlugin = require('../src/index')


module.exports = {
  createBundleFromEntry,
  createBundleFromRequiresArray,
  createBundleFromRequiresArrayPath,
  generateConfigFromFiles,
  filesToConfigSource
}

async function createBundleFromEntry (path, sesifyConfig) {
  const bundler = browserify([], sesifyPlugin.args)
  bundler.add(path)
  bundler.plugin(sesifyPlugin, sesifyConfig)
  return bundleAsync(bundler)
}

async function createBundleFromRequiresArrayPath (path, sesifyConfig) {
  const depsArray = require(path)
  return createBundleFromRequiresArray(depsArray, sesifyConfig)
}

async function createBundleFromRequiresArray (files, sesifyConfig) {
  const bundler = createBrowserifyFromRequiresArray({ files, sesifyConfig })
  return bundleAsync(bundler)
}

function createBrowserifyFromRequiresArray ({ files, sesifyConfig }) {  
  // empty bundle but inject modules at bundle time
  const bifyOpts = Object.assign({}, sesifyPlugin.args)
  const bundler = browserify([], bifyOpts)
  bundler.plugin(sesifyPlugin, sesifyConfig)

  // override browserify's module resolution
  const mdeps = bundler.pipeline.get('deps').get(0)
  mdeps.resolve = (id, parent, cb) => {
    const parentModule = files.find(f => f.id === parent.id)
    const moduleId = parentModule ? parentModule.deps[id] : id
    const module = files.find(f => f.id === moduleId)

    const file = module.file
    const pkg = null
    const fakePath = module.file
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
  let sesifyConfig
  const promise = new Promise((resolve) => {
    sesifyConfig = { autoConfig: resolve }
  })

  const bundler = createBrowserifyFromRequiresArray({ files, sesifyConfig })
  await bundleAsync(bundler)
  const config = await promise
  return config
}

async function bundleAsync (bundler) {  
  const src = await pify(cb => bundler.bundle(cb))()
  return src.toString()
}
