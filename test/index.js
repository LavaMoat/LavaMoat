const fs = require('fs')
const test = require('tape')
const createPack = require('browser-pack')
const miss = require('mississippi')
const browserify = require('browserify')
const sesifyPlugin = require('../src/index')
const { SES } = require('../src/ses.js')
const generatePrelude = require('../src/generatePrelude')

const basicSesifyPrelude = generatePrelude()

test('basic', (t) => {
  createBundleFromRequiresArray(__dirname + '/fixtures/basic-deps.json', (err, result) => {
    if (err) return t.fail(err)
    console.log('result:', result)
    // console.log('evaling...')
    try {
      eval(result)
      t.equal(global.result, 555)
    } catch (err) {
      console.log(err.stack)
      t.fail(err)
    } finally {
      t.end()
    }
  })
})

test('console overwrite', (t) => {
  createBundleFromRequiresArray(__dirname + '/fixtures/overwrite-deps.json', (err, result) => {
    if (err) return t.fail(err)
    // console.log('result:', result)
    // console.log('evaling...')
    try {
      eval(result)
      t.deepEqual(global.result, ['ho', 'hum'])
    } catch (err) {
      t.fail(err)
    } finally {
      t.end()
    }
  })
})

test('browserify plugin', (t) => {
  createBundleFromEntry(__dirname + '/fixtures/nothing.js', (err, bundle) => {
    if (err) return t.fail(err)
    t.assert(bundle.includes(basicSesifyPrelude))
    t.end()
  })
})

test('browserify plugin - alternate', (t) => {
  const b = browserify({ prelude: sesifyPlugin.prelude })
  b.add(__dirname + '/fixtures/nothing.js')
  b.bundle(function (err, src) {
    if (err) return t.fail(err)
    t.assert(src.toString().includes(basicSesifyPrelude))
    t.end()
  })
})

function createBundleFromEntry(path, cb){
  const b = browserify({ plugin: sesifyPlugin })
  b.add(path)
  b.bundle(function (err, src) {
    if (err) return cb(err)
    cb(null, src.toString())
  })
}

function createBundleFromRequiresArray(path, cb){
  const pack = createSesifyPack()
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

function createSesifyPack() {
  const pack = createPack({
    prelude: generatePrelude(),
  })
  return pack
}
