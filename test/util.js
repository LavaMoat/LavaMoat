const fs = require('fs')
const test = require('tape')
const miss = require('mississippi')
const browserify = require('browserify')
const from = require('from')
const pify = require('pify')
const pump = require('pump')
const toStream = require('mississippi').to.obj

const sesifyPlugin = require('../src/index')
const { createConfigSpy } = require('../src/generateConfig')

const { generatePrelude, createSesifyPacker } = sesifyPlugin
const basicSesifyPrelude = generatePrelude()

module.exports = {
  createBundleFromEntry,
  createBundleFromRequiresArray,
  createBundleFromRequiresArrayPath,
  generateConfigFromFiles,
  filesToConfigSource
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
    defaultEndowments: 'return {}'
  }, sesifyConfig)
  const pack = createSesifyPacker(packOpts)
  return new Promise((resolve, reject) => {
    miss.pipe(
      from(depsArray),
      pack,
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
  return new Promise((resolve, reject) => {
    const configSpy = createConfigSpy({ onResult: resolve })
    const sink = toStream((data, encoding, cb) => cb())
    pump(
      from(files),
      configSpy,
      sink,
      (err) => {
        if (err) return reject(err)
      }
    )
  })
}
