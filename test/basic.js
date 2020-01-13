const test = require('tape-promise').default(require('tape'))
const clone = require('clone')

const { generatePrelude } = require('../src/index')
const {
  createBundleFromRequiresArray,
  createBundleFromRequiresArrayPath,
  createBundleFromEntry,
  generateConfigFromFiles
} = require('./util')

test('basic - bundle works', async (t) => {
  const path = __dirname + '/fixtures/basic-deps.json'
  const config = {
    "resources": {
      "<root>": {
        packages: {
          "2": true,
        }
      },
    }
  }
  const result = await createBundleFromRequiresArrayPath(path, { config })
  try {
    eval(result)
    t.equal(global.testResult, 555)
  } catch (err) {
    t.fail(err)
  }
})

test('basic - browserify plugin injects prelude', async (t) => {
  const basicPrelude = generatePrelude()
  const bundle = await createBundleFromEntry(__dirname + '/fixtures/nothing.js', {dryRun: true})
  t.assert(basicPrelude.length > 10, 'prelude not empty')
  t.assert(bundle.includes(basicPrelude))
})

test('basic - browserify bundle doesnt inject global', async (t) => {
  const bundle = await createBundleFromEntry(__dirname + '/fixtures/global.js')
  const hasGlobalInjection = bundle.includes('typeof global !== \"undefined\" ? global :', {dryRun: true})
  t.notOk(hasGlobalInjection, 'did not inject "global" ref')
})

test('basic - browserify bundle doesnt inject global in deps', async (t) => {
  const files = [{
    // id must be full path
    id: './apple.js',
    file: './apple.js',
    deps: {
      'banana': './node_modules/banana/index.js',
    },
    source: 'require("banana")',
    entry: true
  }, {
    // non-entry
    id: './node_modules/banana/index.js',
    file: './node_modules/banana/index.js',
    deps: {},
    source: 'global'
  }]
  const config = await generateConfigFromFiles({ files: clone(files) })
  const bundle = await createBundleFromRequiresArray(clone(files), { config })
  const hasGlobalInjection = bundle.includes('typeof global !== \\"undefined\\" ? global :')
  t.notOk(hasGlobalInjection, 'did not inject "global" ref')
})

test('basic - lavamoat config and bundle', async (t) => {
  const files = [{
    // id must be full path
    id: './apple.js',
    file: './apple.js',
    deps: {
      'banana': './node_modules/banana/index.js',
    },
    source: 'global.testResult = require("banana")()',
    entry: true
  }, {
    // non-entry
    id: './node_modules/banana/index.js',
    file: './node_modules/banana/index.js',
    deps: {},
    source: 'module.exports = () => location.href'
  }]
  const getConfig = await generateConfigFromFiles({ files: clone(files) })
  const prelude = generatePrelude({ getConfig })
  const config = getConfig
  const bundle = await createBundleFromRequiresArray(clone(files), { config })

  t.assert(prelude.includes('"banana": true'), 'prelude includes banana config')
  t.assert(bundle.includes(prelude), 'bundle includes expected prelude')

  const testHref = 'https://funky.town.gov/yolo?snake=yes'
  global.location = { href: testHref }
  eval(bundle)
  try {
    eval(bundle)
  } catch (err) {
    t.fail(`eval of bundle failed:\n${err.stack || err}`)
  }
  t.equal(global.testResult, testHref, 'test result matches expected')
})
