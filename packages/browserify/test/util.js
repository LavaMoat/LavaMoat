const fs = require('fs')
const test = require('tape')
const miss = require('mississippi')
const browserify = require('browserify')
const from = require('from')
const pify = require('pify')
const sesifyPlugin = require('../src/index')

const { generatePrelude, createSesifyPacker } = sesifyPlugin
const basicSesifyPrelude = generatePrelude()

module.exports = {
  createBundleFromEntry,
  createBundleFromRequiresArray,
  createBundleFromRequiresArrayPath,
}

async function createBundleFromEntry (path) {
  const b = browserify({ plugin: sesifyPlugin })
  b.add(path)
  const src = await pify(cb => b.bundle(cb))()
  return src.toString()
}

async function createBundleFromRequiresArrayPath (path, sesifyConfig) {
  const depsArray = require(path)
  return createBundleFromRequiresArray(depsArray, sesifyConfig)
}

async function createBundleFromRequiresArray (depsArray, sesifyConfig) {
  const packOpts = Object.assign({}, {
    defaultEndowments: 'return {}',
  }, sesifyConfig)
  const pack = createSesifyPacker(packOpts)
  return new Promise((resolve, reject) => {
    miss.pipe(
      from(depsArray),
      pack,
      miss.concat((result) => resolve(result.toString())),
      (err) => { if (err) reject(err) },
    )
  })
}