const test = /** @type {import('ava').TestFn} */ (require('ava'))
const { scaffold, runScriptWithSES } = require('./scaffold.js')
const { makeConfig } = require('./fixtures/main/webpack.config.js')

test.before(async (t) => {
  const policy1 = {
    resources: {
      'dynamic-stealer': {
        globals: {
          'console.error': true,
        },
        // note no packages allowed
      },
      malicious: {
        globals: {
          FLAG: true,
        },
      },
    },
  }
  const policy2 = {
    resources: {
      ...policy1.resources,
      'dynamic-target': {
        globals: {
          console: true,
        },
      },
      'dynamic-importer': {
        globals: {
          console: true,
        },
        packages: {
          'dynamic-target': true,
        },
      },
      'dynamic-importer2': {
        globals: {
          console: true,
        },
        packages: {
          'dynamic-target': true,
        },
      },
    },
  }
  const policy3 = {
    resources: {
      ...policy1.resources,
      'dynamic-target': {
        globals: {
          console: true,
        },
      },
      'dynamic-importer': {
        globals: {
          console: true,
        },
        packages: {
          'dynamic-target': true,
        },
      },
      'dynamic-importer2': {
        globals: {
          console: true,
        },
        packages: {},
      },
    },
  }

  const webpackConfig1 = makeConfig({
    generatePolicy: false,
    policy: policy1,
  })
  const webpackConfig2 = makeConfig({
    generatePolicy: false,
    policy: policy2,
  })
  const webpackConfig3 = makeConfig({
    generatePolicy: false,
    policy: policy3,
  })
  webpackConfig1.entry = {
    hack: './hack-dynamic.js',
    app1: './dynamic.js',
    app2: './dynamic-chunk.js',
  }
  webpackConfig2.entry = {
    app1: './dynamic.js',
    app2: './dynamic-chunk.js',
  }
  webpackConfig3.entry = {
    app1: './dynamic.js',
  }

  await t.notThrowsAsync(async () => {
    t.context.build1 = await scaffold(webpackConfig1)
  }, 'Expected the build1 to succeed')
  t.context.bundle1 = t.context.build1.snapshot['/dist/hack.js']

  await t.notThrowsAsync(async () => {
    t.context.build2 = await scaffold(webpackConfig2)
  }, 'Expected the build2 to succeed')
  await t.notThrowsAsync(async () => {
    t.context.build3 = await scaffold(webpackConfig3)
  }, 'Expected the build3 to succeed')
})

test('webpack/dynamic - dist shape', (t) => {
  t.snapshot({
    build1: Object.keys(t.context.build1.snapshot),
    build2: Object.keys(t.context.build2.snapshot),
    build3: Object.keys(t.context.build3.snapshot),
  })
})

test('webpack/hack-dynamic - bundle1 contains context module entry for the hack import to resolve', (t) => {
  // If this fails and the bundle contains an array of numbers for hack.js instead, it means webpack created a chunk for the dynamic import, which we're trying to avoid because while it'd work seamlessly in the browser, it won't work in our node.js setup.
  t.regex(t.context.bundle1, /\.\/hack.js.:[0-9]+/)
})

test('webpack/hack-dynamic - stealer uses dynamic import with context module to byppass policy and fails', async (t) => {
  let FLAG, TEST_FINISHED

  const done = new Promise((resolve, reject) => {
    FLAG = function () {
      reject('FLAG should not be reachable!')
    }
    TEST_FINISHED = resolve
  })

  runScriptWithSES(t.context.bundle1, { FLAG, TEST_FINISHED, console })

  await t.notThrowsAsync(
    done,
    'Expected the bundle to run without reaching the FLAG'
  )
})

test('webpack/dynamic - valid dynamic import capabilities work with chunks', async (t) => {
  const logs = []
  const global = {
    ...globalWithDocumentOnWhichDynamicchunkScriptExists(),
    console: {
      ...console,
      log: (a) => {
        logs.push(a)
        console.log('console.log from bundle: ', a)
      },
    },
  }
  const appWithDynamicChunkPreloaded =
    t.context.build2.snapshot['/dist/app2.js'] +
    ';;' +
    t.context.build2.snapshot['/dist/dynamicchunk.js']
  runScriptWithSES(appWithDynamicChunkPreloaded, global)

  await new Promise((resolve) => setTimeout(resolve, 0))
  t.assert(logs.includes('Dynamic module loaded successfully'))
})

test('webpack/dynamic - valid dynamic import capabilities work through context module', async (t) => {
  const logs = []
  const global = {
    ...globalWithDocumentOnWhichDynamicchunkScriptExists(),
    console: {
      ...console,
      log: (a) => {
        logs.push(a)
        console.log('console.log from bundle: ', a)
      },
    },
  }
  t.assert(
    t.context.build2.snapshot['/dist/dynamicchunk.js'].includes(
      'dynamic-target'
    )
  )
  t.assert(
    !t.context.build2.snapshot['/dist/app1.js'].includes(
      'Dynamic module loaded successfully'
    )
  )

  const appWithDynamicChunkPreloaded =
    t.context.build2.snapshot['/dist/dynamicchunk.js'] +
    ';;' +
    t.context.build2.snapshot['/dist/app1.js']

  runScriptWithSES(appWithDynamicChunkPreloaded, global)

  await new Promise((resolve) => setTimeout(resolve, 0)) // there's an async gap in chunk loading even if chunk is already there
  t.assert(logs.includes('Dynamic module loaded successfully'))
})

test('webpack/dynamic - policy enforcement on dependency from chunk', async (t) => {
  const buildWithStricterPolicy = t.context.build1.snapshot

  const global = globalWithDocumentOnWhichDynamicchunkScriptExists()

  const appWithDynamicChunkPreloaded =
    buildWithStricterPolicy['/dist/dynamicchunk.js'] +
    ';;' +
    buildWithStricterPolicy['/dist/app2.js']

  await t.throwsAsync(
    withUnhandledRejectionCaptured(() => {
      runScriptWithSES(appWithDynamicChunkPreloaded, global)
    }),
    {
      message:
        /Policy does not allow importing dynamic-target from dynamic-importer/,
    }
  )
})
test('webpack/dynamic - policy enforcement on dependency from context module', async (t) => {
  const buildWithStricterPolicy = t.context.build1.snapshot

  const global = globalWithDocumentOnWhichDynamicchunkScriptExists()
  const appWithDynamicChunkPreloaded =
    buildWithStricterPolicy['/dist/dynamicchunk.js'] +
    ';;' +
    buildWithStricterPolicy['/dist/app1.js']

  await t.throwsAsync(
    withUnhandledRejectionCaptured(() => {
      runScriptWithSES(appWithDynamicChunkPreloaded, global)
    }),
    {
      message:
        /Policy does not allow importing dynamic-target from dynamic-importer/,
    }
  )
})
test('webpack/dynamic - policy enforcement on dependency from context module when allowed elsewhere', async (t) => {
  const buildWithSelectivePolicy = t.context.build3.snapshot

  const appWithDynamicChunkPreloaded =
    buildWithSelectivePolicy['/dist/dynamicchunk0.js'] +
    ';;' +
    buildWithSelectivePolicy['/dist/app1.js']

  await t.throwsAsync(
    withUnhandledRejectionCaptured(() => {
      runScriptWithSES(appWithDynamicChunkPreloaded)
    }),
    {
      message:
        /Policy does not allow importing dynamic-target from dynamic-importer2/,
    }
  )
})

/**
 * Creates a global object with a document object that pretends to contain the
 * chunk script. Includes timeouts to get to the point where the script is
 * considered present.
 */
function globalWithDocumentOnWhichDynamicchunkScriptExists() {
  return {
    console,
    setTimeout: (fn, ms) => {
      return setTimeout(fn, ms).unref()
    },
    clearTimeout,
    document: {
      getElementsByTagName: () => [
        {
          getAttribute: (attr) => {
            if (attr === 'src') {
              return 'dynamicchunk.js'
            }
          },
        },
      ], // makes webpack consider looking up the chunk without loading it dynamically
    },
  }
}

const rejectionTestsQueueHandle = { promise: Promise.resolve() }
/**
 * Disables the unhandledRejection listener temporarily to avoid AVA's global
 * listener from catching the rejection.
 *
 * I'll regret this.
 *
 * I had to avoid overlapping execution from different tests
 *
 * @param {async function} asyncFn
 */
function withUnhandledRejectionCaptured(asyncFn) {
  const next = rejectionTestsQueueHandle.promise.then(() => {
    const originalHandlers = process.listeners('unhandledRejection')
    process.removeAllListeners('unhandledRejection')
    const repair = () => {
      process.removeAllListeners('unhandledRejection')
      originalHandlers.forEach((handler) => {
        process.on('unhandledRejection', handler)
      })
    }
    return new Promise((resolve, reject) => {
      process.on('unhandledRejection', (error) => {
        console.error('unhandledRejection', error.message)
        repair()
        reject(error)
      })
      setTimeout(() => {
        repair()
        resolve('Timed out without unhandledRejection.')
      }, 5000)

      asyncFn()
    })
  })
  rejectionTestsQueueHandle.promise = next.catch(() => {}) // don't pollute current test with errors from previous
  return next
}
