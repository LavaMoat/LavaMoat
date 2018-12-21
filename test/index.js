const fs = require('fs')
const test = require('tape')
const createPack = require('browser-pack')
const miss = require('mississippi')
const { SES } = require('../src/ses.js')

const sesifyPrelude = fs.readFileSync(__dirname + '/../src/prelude.js', 'utf8')

test('basic', (t) => {
  createBundleFromFixture((err, result) => {
    if (err) return t.fail(err)
    // console.log('result:', result)
    // console.log('evaling...')
    try {
      eval(result)
    } catch (err) {
      t.fail(err)
    } finally {
      t.end()
    }
  })
})

function createBundleFromFixture(cb){
  const pack = createSesifyPack()
  miss.pipe(
    fs.createReadStream(__dirname + '/fixtures/basic-deps.json'),
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
