const test = /** @type {import('ava').TestFn} */ (require('ava'))
const { scaffold, runScriptWithSES } = require('./scaffold.js')
const { makeConfig } = require('./fixtures/main/webpack.config.js')
const { isBuiltin } = require('node:module')
const path = require('node:path')

test.before(async (t) => {
  const webpackConfig = makeConfig({
    generatePolicy: true,
    emitPolicySnapshot: true,
    isBuiltin,
    policyLocation: path.resolve(__dirname, 'fixtures/main/policy-node'),
  })
  webpackConfig.target = 'node'
  webpackConfig.optimization.minimize = false
  webpackConfig.entry = {
    app: './node.js',
  }
  await t.notThrowsAsync(async () => {
    t.context.build = await scaffold(webpackConfig)
  }, 'Expected the build to succeed')
  t.context.bundle = t.context.build.snapshot['/dist/app.js']
})

test('webpack/node.js - policy shape', (t) => {
  t.snapshot(t.context.build.snapshot['/dist/policy-snapshot.json'])
})

test('webpack/node.js - bundle runs without throwing', (t) => {
  let capture
  t.plan(3)
  t.notThrows(() => {
    runScriptWithSES(t.context.bundle, {
      console: {
        ...console,
        log: (dir) => {
          capture = dir
        },
      },
      require,
    })
  })
  t.true(Array.isArray(capture), 'expected captured object to be an array')
  t.true(
    capture.includes('README.md'),
    'expected captured array to include some actual files'
  )
})
