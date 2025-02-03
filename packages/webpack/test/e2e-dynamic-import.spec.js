const test = require('ava')
const { scaffold, runScriptWithSES } = require('./scaffold.js')
const { makeConfig } = require('./fixtures/main/webpack.config.js')

test.before(async (t) => {
  const webpackConfig = makeConfig({
    generatePolicy: false,
    policy: {
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
    },
    diagnosticsVerbosity: 1,
    // __unsafeAllowContextModules: true,
  })
  webpackConfig.entry = {
    hack: './hack-dynamic.js',
    app: './dynamic.js',
  }

  await t.notThrowsAsync(async () => {
    t.context.build = await scaffold(webpackConfig)
  }, 'Expected the build to succeed')
  t.context.bundle = t.context.build.snapshot['/dist/hack.js']
})

test('webpack/hack-dynamic - dist shape', (t) => {
  t.snapshot(Object.keys(t.context.build.snapshot))
})

test('webpack/hack-dynamic - bundle contains context module entry for the import to resolve', (t) => {
  // If this fails and the bundle contains an array of numbers for hack.js instead, it means webpack created a chunk for the dynamic import, which we're trying to avoid because while it'd work seamlessly in the browser, it won't work in our node.js setup.
  t.regex(t.context.bundle, /\.\/hack.js.:[0-9]+/)
})

test('webpack/hack-dynamic - stealer uses dynamic import with context module to byppass policy and fails', async (t) => {
  let FLAG, TEST_FINISHED

  const done = new Promise((resolve, reject) => {
    FLAG = function () {
      reject('FLAG should not be reachable!')
    }
    TEST_FINISHED = resolve
  })

  runScriptWithSES(t.context.bundle, { FLAG, TEST_FINISHED, console })

  await t.notThrowsAsync(
    done,
    'Expected the bundle to run without reaching the FLAG'
  )
})

test.failing(
  'webpack/hack-dynamic - valid dynamic import capabilities work',
  (t) => {
    // Not sure how to test that, as the code for dynamically loading chunks is depending on a lot of browser APIs
    runScriptWithSES(t.context.build.snapshot['/dist/app.js'], { console })
  }
)
