const test = require('tape-promise').default(require('tape'))

const { generateConfigFromFiles } = require('./util')

test('empty config', async (t) => {
  const files = []
  const config = await generateConfigFromFiles({ files })
  t.deepEqual(config, { resources: {} }, 'config matches expected')
})

test('basic config', async (t) => {
  const files = [{
    id: 1,
    file: './apple.js',
    deps: {
      'banana': 2
    },
    source: 'require("banana")'
  }, {
    // non-entry
    id: 2,
    file: './node_modules/banana/index.js',
    deps: {},
    source: 'location.href'
  }]
  const config = await generateConfigFromFiles({ files })

  t.deepEqual(config, {
    resources: {
      '<root>': {
        modules: {
          'banana': true
        }
      },
      'banana': {
        globals: {
          'location.href': true
        }
      }
    }
  }, 'config matched expected')
})

test('config with skipped deps', async (t) => {
  const files = [{
    // id must be full path
    id: 1,
    file: './apple.js',
    deps: {
      'banana': 2,
      'snakefruit': false
    },
    source: 'require("banana")'
  }, {
    // non-entry
    id: 2,
    file: './node_modules/banana/index.js',
    deps: {},
    source: 'location.href'
  }]
  const config = await generateConfigFromFiles({ files })

  t.deepEqual(config, {
    resources: {
      '<root>': {
        modules: {
          'banana': true
        }
      },
      'banana': {
        globals: {
          'location.href': true
        }
      }
    }
  }, 'config matches expected')
})
