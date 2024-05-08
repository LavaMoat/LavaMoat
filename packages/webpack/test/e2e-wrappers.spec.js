const test = require('ava')
// eslint-disable-next-line ava/no-import-test-files
const { scaffold, runScriptWithSES } = require('./scaffold.js')
const { makeConfig } = require('./fixtures/main/webpack.config.js')

const bundleForWrpper = async (t, name) => {
  const webpackConfigWith = makeConfig({
    wrapper: name,
    diagnosticsVerbosity: 1,
  })
  t.context[name] = {}
  await t.notThrowsAsync(async () => {
    t.context[name].build = await scaffold(webpackConfigWith)
  }, `Expected the build '${name}' to succeed`)

  t.context[name].bundle = t.context[name].build.snapshot['/dist/app.js']
}

test.before(async (t) => {
  await bundleForWrpper(t, 'with')
  await bundleForWrpper(t, 'func')
})

test('webpack/main - dist shape', (t) => {
  t.deepEqual(
    Object.keys(t.context['with'].build.snapshot),
    Object.keys(t.context['func'].build.snapshot)
  )
  t.snapshot(Object.keys(t.context['with'].build.snapshot))
  t.snapshot(Object.keys(t.context['func'].build.snapshot))
  console.log(t.context['func'].bundle)
})

test('webpack/main - bundle runs without throwing', (t) => {
  t.notThrows(() => {
    runScriptWithSES(t.context['with'].bundle, { console })
  })
  t.notThrows(() => {
    runScriptWithSES(t.context['func'].bundle, { console })
  })
})

test('webpack/main - bundle contains the lavamoat wrapping', (t) => {
  t.regex(t.context['with'].bundle, /_LM_/)
  t.regex(t.context['func'].bundle, /_LM_/)
})
