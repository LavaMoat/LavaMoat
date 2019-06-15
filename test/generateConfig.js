const test = require('tape-promise').default(require('tape'))

const { generateConfigFromFiles } = require('./util')

test('empty config', async (t) => {
  const files = []
  const config = await generateConfigFromFiles({ files })
  t.deepEqual(config, { resources: {} }, 'config matches expected')
})

test('basic config', async (t) => {
  const files = [{
    id: './apple.js',
    file: './apple.js',
    deps: {
      'banana': './node_modules/banana/index.js'
    },
    source: 'require("banana")'
  }, {
    // non-entry
    id: './node_modules/banana/index.js',
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
    id: './apple.js',
    file: './apple.js',
    deps: {
      'banana': './node_modules/banana/index.js',
      'snakefruit': false
    },
    source: 'require("banana")'
  }, {
    // non-entry
    id: './node_modules/banana/index.js',
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


test('config ignores global refs', async (t) => {
  const files = [{
    // id must be full path
    id: './entry.js',
    file: './entry.js',
    deps: {
      'test': './node_modules/test/index.js'
    },
    source: 'require("test")'
  }, {
    // non-entry
    id: './node_modules/test/index.js',
    file: './node_modules/test/index.js',
    deps: {},
    source: `
    const href = window.location.href;
    const xhr = new window.XMLHttpRequest;
    `
  }]
  const config = await generateConfigFromFiles({ files })

  t.deepEqual(config, {
    resources: {
      '<root>': {
        modules: {
          'test': true
        }
      },
      'test': {
        globals: {
          'location.href': true,
          'XMLHttpRequest': true,
        }
      }
    }
  }, 'config matches expected')
})
