const test = require('ava')
// eslint-disable-next-line ava/no-import-test-files
const { scaffold, runScriptWithSES, runScript } = require('./scaffold.js')
const webpackConfigDefault = require('./fixtures/main/webpack.config.js')

test.before(async (t) => {
  const webpackConfig = {
    ...webpackConfigDefault,
    entry: {
      hack1: './hack1.js',
      hack2: './hack2.js',
      hack3: './hack3.js',
    },
  }
  await t.notThrowsAsync(async () => {
    t.context.build = await scaffold(webpackConfig)
  }, 'Expected the build to succeed')
})

test('webpack/hack - dist shape', (t) => {
  t.snapshot(Object.keys(t.context.build.snapshot))
})

test('webpack/hack/loader - bundle runs without reaching the FLAG', (t) => {
  const FLAG = function () {
    t.fail('FLAG should not be reachable!')
  }

  t.throws(
    () => {
      runScriptWithSES(t.context.build.snapshot['/dist/hack1.js'], { FLAG })
    },
    { message: /FLAG is not a function/ }
  )
})

test('webpack/hack/loader - doublecheck in reported excluded files', (t) => {
  t.notRegex(t.context.build.stdout, /excluded modules.*hack.js/s) // `s` for multiline matching
})

test('webpack/hack/fetch - disallows fetch', (t) => {
  t.throws(
    () => {
      runScriptWithSES(t.context.build.snapshot['/dist/hack2.js'], {})
    },
    { message: /fetch is not a function/ }
  )
})

test('webpack/hack/fetch - cannot pollute prototypes', (t) => {
  t.throws(
    () => {
      runScriptWithSES(t.context.build.snapshot['/dist/hack3.js'], {})
    },
    { message: /Cannot add property polluted, object is not extensible/ }
  )
})
