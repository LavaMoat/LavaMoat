const fs = require('fs')
const test = require('tape')
const createPack = require('browser-pack')
const miss = require('mississippi')
const browserify = require('browserify')
const sesifyPlugin = require('../src/index')
const { SES } = require('../src/ses.js')

const sesifyPrelude = fs.readFileSync(__dirname + '/../src/prelude.js', 'utf8')

test('basic', (t) => {
  createBundleFromFixture(__dirname + '/fixtures/basic-deps.json', (err, result) => {
    if (err) return t.fail(err)
    // console.log('result:', result)
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
  createBundleFromFixture(__dirname + '/fixtures/overwrite-deps.json', (err, result) => {
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
  const b = browserify()
  b.add(__dirname + '/fixtures/nothing.js')
  b.plugin(sesifyPlugin)
  b.bundle(function (err, src) {
    if (err) return t.fail(err)
    t.assert(src.toString().includes(sesifyPrelude))
    t.end()
  })
})

test('browserify plugin - alternate', (t) => {
  const b = browserify({ prelude: sesifyPlugin.prelude })
  b.add(__dirname + '/fixtures/nothing.js')
  b.bundle(function (err, src) {
    if (err) return t.fail(err)
    t.assert(src.toString().includes(sesifyPrelude))
    t.end()
  })
})


function createBundleFromFixture(path, cb){
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
    prelude: sesifyPrelude,
  })
  return pack
}
