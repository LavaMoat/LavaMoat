const fs = require('fs')
const test = require('tape')
const miss = require('mississippi')
const browserify = require('browserify')
const sesifyPlugin = require('../src/index')

const { generatePrelude, createSesifyPacker } = sesifyPlugin
const basicSesifyPrelude = generatePrelude()

module.exports = {
  createBundleFromEntry,
  createBundleFromRequiresArray,
}

function createBundleFromEntry(path, cb){
  const b = browserify({ plugin: sesifyPlugin })
  b.add(path)
  b.bundle(function (err, src) {
    if (err) return cb(err)
    cb(null, src.toString())
  })
}

function createBundleFromRequiresArray (path, sesifyConfig, cb){
  const packOpts = Object.assign({}, {
    raw: false,
    defaultEndowments: 'return {}',
  }, sesifyConfig)
  const pack = createSesifyPacker(packOpts)
  miss.pipe(
    fs.createReadStream(path),
    pack,
    miss.concat((result) => cb(null, result.toString())),
    (err) => {
      if (!err) return
      cb(err)
    },
  )
}
