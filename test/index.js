const fs = require('fs')
const test = require('tape')
const miss = require('mississippi')
const browserify = require('browserify')
const sesifyPlugin = require('../src/index')

const { generatePrelude, createSesifyPacker } = sesifyPlugin
const basicSesifyPrelude = generatePrelude()

test('basic', (t) => {
  const path = __dirname + '/fixtures/basic-deps.json'
  const sesifyConfig = {}
  createBundleFromRequiresArray(path, sesifyConfig, (err, result) => {
    if (err) return t.fail(err)
    try {
      eval(result)
      t.equal(global.testResult, 555)
    } catch (err) {
      console.log(err.stack)
      t.fail(err)
    } finally {
      t.end()
    }
  })
})

test('prevent module cache attack', (t) => {
  const path = __dirname + '/fixtures/deps-cache-attack.json'
  const sesifyConfig = {}
  createBundleFromRequiresArray(path, sesifyConfig, (err, result) => {
    if (err) return t.fail(err)
    try {
      eval(result)
      t.deepEqual(global.testResult, false)
    } catch (err) {
      t.fail(err)
    } finally {
      t.end()
    }
  })
})

test('specified endowments', (t) => {
  const path = __dirname + '/fixtures/overwrite-deps.json'
  const sesifyConfig = {}
  createBundleFromRequiresArray(path, sesifyConfig, (err, result) => {
    if (err) return t.fail(err)
    try {
      eval(result)
      t.deepEqual(global.testResult, ['ho', 'hum'])
    } catch (err) {
      t.fail(err)
    } finally {
      t.end()
    }
  })
})

// here we are providing an endowments only to a module deep in a dep graph
test('endowments config - deep endow', (t) => {
  const path = __dirname + '/fixtures/need-config-endow.json'
  const sesifyConfig = {
    endowmentsConfig: `
      const postMessageEndowment = {
        window: {
          postMessage: (message) => { global.testResult = message }
        }
      }

      return {
        dependencies: {
          "two": {
            "three": {
              $: postMessageEndowment,
            },
          },
        },
      }`,
  }

  createBundleFromRequiresArray(path, sesifyConfig, (err, result) => {
    if (err) return t.fail(err)

    try {
      eval(result)
      t.deepEqual(global.testResult, '12345')
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
