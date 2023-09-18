const test = require('ava')
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

test('scorchwrap/ses-dependency - dist shape', (t) => {
  t.snapshot(Object.keys(t.context.build.snapshot))
})

test('scorchwrap/ses-dependency - no-op when running without SES', (t) => {
  t.notThrows(() => {
    runScript(t.context.build.snapshot['/dist/throws.js'], {})
  })
})

test('scorchwrap/ses-dependency - test the test', (t) => {
  t.throws(
    () => {
      runScriptWithSES(t.context.build.snapshot['/dist/throws.js'], {})
    },
    { message: /This error should not have been thrown/ },
  )
})
