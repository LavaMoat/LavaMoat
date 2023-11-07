const test = require('ava')
// eslint-disable-next-line ava/no-import-test-files
const { scaffold, runScriptWithSES, runScript } = require('./scaffold.js')
const webpackConfigDefault = require('./fixtures/main/webpack.config.js')

test.before(async (t) => {
  const webpackConfig = {
    ...webpackConfigDefault,
    entry: {
      throws: './throws.js',
    },
  }
  await t.notThrowsAsync(async () => {
    t.context.build = await scaffold(webpackConfig)
  }, 'Expected the build to succeed')
})

test('webpack/ses-dependency - dist shape', (t) => {
  t.snapshot(Object.keys(t.context.build.snapshot))
})

test('webpack/ses-dependency - no-op when running without SES', (t) => {
  t.notThrows(() => {
    runScript(t.context.build.snapshot['/dist/throws.js'], {})
  })
})

test('webpack/ses-dependency - test the test', (t) => {
  t.throws(
    () => {
      runScriptWithSES(t.context.build.snapshot['/dist/throws.js'], {})
    },
    { message: /This error should not have been thrown/ }
  )
})
