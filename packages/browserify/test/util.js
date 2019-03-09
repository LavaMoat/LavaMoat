const fs = require('fs')
const test = require('tape')
const miss = require('mississippi')
const browserify = require('browserify')
const from = require('from')
const sesifyPlugin = require('../src/index')
const { createConfigSpy } = require('../src/generateConfig')

const { generatePrelude, createSesifyPacker } = sesifyPlugin
const basicSesifyPrelude = generatePrelude()

module.exports = {
  createBundleFromEntry,
  createBundleFromRequiresArray,
  createBundleFromRequiresArrayPath,
}

function createBundleFromEntry(path, cb){
  const b = browserify({ plugin: sesifyPlugin })
  b.add(path)
  b.bundle(function (err, src) {
    if (err) return cb(err)
    cb(null, src.toString())
  })
}

function createBundleFromRequiresArrayPath (path, sesifyConfig, cb){
  const depsArray = require(path)
  createBundleFromRequiresArray(depsArray, sesifyConfig, cb)
}

function createBundleFromRequiresArray (depsArray, sesifyConfig, cb){
  const packOpts = Object.assign({}, {
    defaultEndowments: 'return {}',
  }, sesifyConfig)
  const pack = createSesifyPacker(packOpts)
  miss.pipe(
    from(depsArray),
    createConfigSpy(),
    pack,
    miss.concat((result) => cb(null, result.toString())),
    (err) => {
      if (!err) return
      cb(err)
    },
  )
}