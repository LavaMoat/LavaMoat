const test = require('tape-promise').default(require('tape'))

const { generateConfigFromFiles } = require('./util')

test('generateConfig - basic config', async (t) => {
  const config = await createConfigForTest(function () {
    location.href
  })

  t.deepEqual(config, {
    resources: {
      test: {
        globals: {
          'location.href': true
        }
      }
    }
  }, 'config matched expected')
})

test('generateConfig - config with debugInfo', async (t) => {
  const config = await createConfigForTest(function () {
    location.href
  }, { includeDebugInfo: true })

  t.deepEqual(config.debugInfo, {
    './node_modules/test/index.js': {
      source: '(function () {\n    location.href\n  })()',
      globals: {
        'location.href': 'read'
      }
    }
  }, 'config matched expected')
})

test('generateConfig - ignore various refs', async (t) => {
  const config = await createConfigForTest(function () {
    const js = [this]
    const ignored = [global, require, module, exports, arguments]
    const globalRefs = [typeof globalThis, typeof self, typeof window]
    const xyz = nonIgnoredGlobal
  })

  t.deepEqual(config, {
    resources: {
      test: {
        globals: {
          nonIgnoredGlobal: true
        }
      }
    }
  }, 'config matched expected')
})

test('generateConfig - config ignores global refs', async (t) => {
  const config = await createConfigForTest(function () {
    const href = window.location.href
    const xhr = new window.XMLHttpRequest()
  })

  t.deepEqual(config, {
    resources: {
      test: {
        globals: {
          'location.href': true,
          XMLHttpRequest: true
        }
      }
    }
  }, 'config matches expected')
})

test('generateConfig - config ignores global refs when properties are not accessed', async (t) => {
  const config = await createConfigForTest(function () {
    typeof window !== undefined
  })

  t.deepEqual(config, {
    resources: {}
  }, 'config matches expected')
})

test('generateConfig - config ignores global refs accessed with whitelist items', async (t) => {
  const config = await createConfigForTest(function () {
    window.Object === Object
  })

  t.deepEqual(config, {
    resources: {}
  }, 'config matches expected')
})

test('generateConfig - unfrozen environment - primordial modification', async (t) => {
  try {
    const config = await createConfigForTest(function () {
      const href = window.location.href
      Array.prototype.bogosort = () => 'yolo'
    })
    t.fail('expected to throw an error')
  } catch (err) {
    t.pass()
  }
})

async function createConfigForTest (testFn, opts = {}) {
  const files = [{
    specifier: './entry.js',
    file: './entry.js',
    packageName: '<root>',
    importMap: {
      test: './node_modules/test/index.js'
    },
    content: 'require("test")',
    entry: true,
  }, {
    // non-entry
    specifier: './node_modules/test/index.js',
    file: './node_modules/test/index.js',
    packageName: 'test',
    importMap: {},
    content: `(${testFn})()`
  }]
  const config = await generateConfigFromFiles({ files, ...opts })
  return config
}
