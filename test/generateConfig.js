const test = require('tape-promise').default(require('tape'))
const from = require('from')
const pump = require('pump')
const toStream = require('mississippi').to.obj

const { createConfigSpy } = require('../src/generateConfig')

test('empty config', async (t) => {
  const files = []
  const config = await generateConfigFromFiles({ files })
  t.deepEqual(config, { resources: {} }, 'config matches expected')
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

  t.deepEqual(config, {
    resources: {
      '<root>': {
        modules: {
          'banana': true,
        },
      },
      'banana': {
        globals: {
          'location.href': true,
        },
      }
    },
  }, 'config matched expected')
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

  t.deepEqual(config, {
    resources: {
      '<root>': {
        modules: {
          'banana': true,
        },
      },
      'banana': {
        globals: {
          'location.href': true,
        },
      },
    },
  }, 'config matches expected')
  t.end()
})


async function generateConfigFromFiles({ files }) {
  const configSource = await filesToConfigSource({ files })
  const config = JSON.parse(configSource)
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
