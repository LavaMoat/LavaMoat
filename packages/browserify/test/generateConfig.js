const test = require('tape-promise').default(require('tape'))

const { generateConfigFromFiles } = require('./util')

test('generateConfig - empty config', async (t) => {
  const files = []
  const config = await generateConfigFromFiles({ files })
  t.deepEqual(config, { resources: {} }, 'config matches expected')
})

test('generateConfig - basic config', async (t) => {
  const config = await createConfigForTest(function(){
    location.href
  })

  t.deepEqual(config, {
    resources: {
      '<root>': {
        packages: {
          'test': true
        }
      },
      'test': {
        globals: {
          'location.href': true
        }
      }
    }
  }, 'config matched expected')
})

test('generateConfig - config with skipped deps', async (t) => {
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
        packages: {
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


test('generateConfig - config ignores global refs', async (t) => {
  const config = await createConfigForTest(function(){
    const href = window.location.href;
    const xhr = new window.XMLHttpRequest;
  })

  t.deepEqual(config, {
    resources: {
      '<root>': {
        packages: {
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

test('generateConfig - config ignores global refs when properties are not accessed', async (t) => {
  const config = await createConfigForTest(function(){
    typeof window !== undefined
  })

  t.deepEqual(config, {
    resources: {
      '<root>': {
        packages: {
          'test': true
        }
      },
    }
  }, 'config matches expected')
})

test('generateConfig - config ignores global refs accessed with whitelist items', async (t) => {
  const config = await createConfigForTest(function(){
    window.Object === Object
  })

  t.deepEqual(config, {
    resources: {
      '<root>': {
        packages: {
          'test': true
        }
      },
    }
  }, 'config matches expected')
})

test('generateConfig - unfrozen environment - primordial modification', async (t) => {
  const config = await createConfigForTest(function(){
    const href = window.location.href;
    Array.prototype.bogosort = () => 'yolo';
  })

  t.deepEqual(config, {
    resources: {
      '<root>': {
        packages: {
          'test': true
        }
      },
      'test': {
        globals: {
          'location.href': true,
        },
        environment: 'unfrozen'
      }
    }
  }, 'config matches expected')
})

test('generateConfig - unfrozen environment - protected names', async (t) => {
  const config = await createConfigForTest(function () {
    module.exports.toString = () => 'cant do this when frozen';
  })

  t.deepEqual(config, {
    resources: {
      '<root>': {
        packages: {
          'test': true
        }
      },
      'test': {
        environment: 'unfrozen'
      }
    }
  }, 'config matches expected')
})

async function createConfigForTest (testFn) {
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
    source: fnToCodeBlock(testFn)
  }]
  const config = await generateConfigFromFiles({ files })
  return config
}

function fnToCodeBlock (fn) {
  return fn.toString().split('\n').slice(1,-1).join('\n')
}