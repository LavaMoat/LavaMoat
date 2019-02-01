const test = require('tape')
const { createConfigSpy } = require('../src/generateConfig')
const from = require('from')
const pump = require('pump')
const toStream = require('mississippi').to.obj

test('empty config', async (t) => {
  const files = []
  const config = await generateConfigFromFiles({ files })
  t.equal(typeof config, 'object')
  t.equal(typeof config.defaultGlobals, 'object')
  t.deepEqual(config.dependencies, {})
  t.deepEqual(config.global, {})
  t.end()
})

test('basic config', async (t) => {
  const files = [{
    // id must be full path
    id: './apple.js',
    deps: {
      'banana': './node_modules/banana/index.js',
    },
    source: 'require("banana")',
  }, {
    // non-entry
    id: './node_modules/banana/index.js',
    deps: {},
    source: 'location.href',
  }]
  const config = await generateConfigFromFiles({ files })
  t.equal(typeof config, 'object')
  t.equal(typeof config.defaultGlobals, 'object')
  t.deepEqual(Object.keys(config.dependencies), ['banana'])
  t.deepEqual(Object.keys(config.dependencies.banana), ['$'])
  t.deepEqual(config.dependencies.banana.$.location.href, 'https://example.com')
  t.deepEqual(config.global, {})
  t.end()
})

test('config with skipped deps', async (t) => {
  const files = [{
    // id must be full path
    id: './apple.js',
    deps: {
      'banana': './node_modules/banana/index.js',
      'snakefruit': false,
    },
    source: 'require("banana")',
  }, {
    // non-entry
    id: './node_modules/banana/index.js',
    deps: {},
    source: 'location.href',
  }]
  const config = await generateConfigFromFiles({ files })
  t.equal(typeof config, 'object')
  t.equal(typeof config.defaultGlobals, 'object')
  t.deepEqual(Object.keys(config.dependencies), ['banana'])
  t.deepEqual(Object.keys(config.dependencies.banana), ['$'])
  t.deepEqual(config.dependencies.banana.$.location.href, 'https://example.com')
  t.deepEqual(config.global, {})
  t.end()
})


async function generateConfigFromFiles({ files }) {
  const configSource = await filesToConfigSource({ files })
  // for eval context
  const sesEval = (code) => eval(code)
  const location = { href: 'https://example.com' }
  const rootGlobal = { location }
  const self = rootGlobal
  const window = rootGlobal
  // evaluate config source
  const config = eval(`(function(){${configSource}; return config })()`)
  return config
}

async function filesToConfigSource({ files }) {
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
