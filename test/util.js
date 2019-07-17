const miss = require('mississippi')
const browserify = require('browserify')
const from = require('from')
const pify = require('pify')
const pump = require('pump')
const clone = require('clone')
const insertGlobals = require('insert-module-globals')
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
  const bundler = browserify()
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
  const bundler = browserify()
  bundler.plugin(sesifyPlugin, sesifyConfig)
  let didInject = false
  bundler.pipeline.splice('deps', 0, through2(null, null, async (cb) => {
    const fileInsert = createFilesInsertStream({ files })
    // setup listener for file insertion completion    
    const promise = pify(cb => miss.finished(fileInsert, cb))()
    // flow files into browserify
    fileInsert.pipe(bundler.pipeline.get('json'))
    // wait for files to flow in
    await promise
    // finally complete
    cb()
  }))
  
  return bundler
}

async function transformSourceInsertGlobals (source) {
  return new Promise((resolve, reject) => {
    pump(
      from([source]),
      insertGlobals(),
      miss.concat((result) => resolve(result.toString())),
      (err) => { if (err) reject(err) }
    )
  })
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

function createTransformSourceInsertGlobalsStream () {
  return through2(async (module, _, cb) => {
    const transformed = await transformSourceInsertGlobals(module.source)
    module.source = transformed
    cb(null, module)
  })
}

function createFilesInsertStream ({ files }) {
  return miss.pipeline.obj(
    // clone the files so they arent mutated
    from(clone(files)),
    // insert module globals, just like browserify
    createTransformSourceInsertGlobalsStream(),
  )
}