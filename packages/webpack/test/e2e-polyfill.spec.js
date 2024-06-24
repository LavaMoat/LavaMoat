const test = require('ava')
const path = require('node:path')
// eslint-disable-next-line ava/no-import-test-files
const { scaffold, runScriptWithSES } = require('./scaffold.js')
const {makeConfig} = require('./fixtures/main/webpack.config.js')

test.before(async (t) => {
  const webpackConfigDefault = makeConfig({
    generatePolicy: true,
    emitPolicySnapshot: true,
    diagnosticsVerbosity: 1,
    policyLocation: path.resolve(__dirname, 'fixtures/main/policy-write'),
  })
  const webpackConfig = {
    ...webpackConfigDefault,
    entry: {
      app: './polyfills.js',
    },
  }
  await t.notThrowsAsync(async () => {
    t.context.build = await scaffold(webpackConfig)
  }, 'Expected the build to succeed')
  t.context.bundle = t.context.build.snapshot['/dist/app.js']
})

test('webpack/polyfill - dist shape', (t) => {
  t.snapshot(Object.keys(t.context.build.snapshot))
})

test('webpack/polyfill - bundle runs without throwing', (t) => {
  t.notThrows(() => {
    runScriptWithSES(t.context.bundle, {console, fancyCapability: undefined})
  })
})
