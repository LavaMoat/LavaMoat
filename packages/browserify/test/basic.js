const test = require('ava')
const clone = require('clone')

const { generatePrelude } = require('../src/index')
const {
  createBundleFromRequiresArray,
  createBundleFromRequiresArrayPath,
  createBundleFromEntry,
  generateConfigFromFiles,
  evalBundle,
} = require('./util')

test('basic - bundle works', async (t) => {
  const files = [
    {
      "id": "./1.js",
      "file": "./1.js",
      "source": "global.testResult = require('foo')(5)",
      "deps": { "foo": "./node_modules/2/index.js" },
      "entry": true
    },
    {
      "id": "./node_modules/2/index.js",
      "file": "./node_modules/2/index.js",
      "source": "module.exports = function (n) { return n * 111 }",
      "deps": {}
    }
  ]
  const config = {
    resources: {}
  }
  const bundle = await createBundleFromRequiresArray(files, { config })
  const result = evalBundle(bundle)

  t.is(result, 555)
})

test('basic - browserify bundle doesnt inject global', async (t) => {
  const bundle = await createBundleFromEntry(__dirname + '/fixtures/global.js')
  const browserifyGlobalPolyfill = 'typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {}'
  const hasGlobalInjection = bundle.includes(browserifyGlobalPolyfill)
  t.falsy(hasGlobalInjection, 'did not inject "global" ref')
})

test('basic - browserify bundle doesnt inject global in deps', async (t) => {
  const files = [{
    // id must be full path
    id: './apple.js',
    file: './apple.js',
    deps: {
      banana: './node_modules/banana/index.js'
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
  t.falsy(hasGlobalInjection, 'did not inject "global" ref')
})

test('basic - lavamoat config and bundle', async (t) => {
  const files = [{
    // id must be full path
    id: './apple.js',
    file: './apple.js',
    deps: {
      banana: './node_modules/banana/index.js'
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
  const config = await generateConfigFromFiles({ files: clone(files) })
  const prelude = generatePrelude()
  const bundle = await createBundleFromRequiresArray(clone(files), { config })

  t.assert(bundle.includes('"location.href":true'), 'prelude includes banana config')
  t.assert(bundle.includes(prelude), 'bundle includes expected prelude')

  const testHref = 'https://funky.town.gov/yolo?snake=yes'
  const testGlobal = { location: { href: testHref } }
  const result = evalBundle(bundle, testGlobal)

  t.is(result, testHref, 'test result matches expected')
})

test('basic - lavamoat bundle without prelude', async (t) => {
  const files = [{
    // id must be full path
    id: './apple.js',
    file: './apple.js',
    deps: {
      banana: './node_modules/banana/index.js'
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
  const config = await generateConfigFromFiles({ files: clone(files) })
  const prelude = generatePrelude()
  const bundle = await createBundleFromRequiresArray(clone(files), { config, includePrelude: false })

  t.assert(!bundle.includes(prelude), 'bundle DOES NOT include prelude')

  let didCallLoadBundle = false
  const testGlobal = {
    LavaMoat: { loadBundle: () => { didCallLoadBundle = true } }
  }

  try {
    evalBundle(bundle, testGlobal)
  } catch (err) {
    t.fail(`eval of bundle failed:\n${err.stack || err}`)
  }
  t.assert(didCallLoadBundle, 'test result matches expected')
})
