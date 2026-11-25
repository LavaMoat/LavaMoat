const { default: test } = /** @type {typeof import('ava')} */ (require('ava'))
const { scaffold, runScriptWithSES } = require('./scaffold.js')
const webpackConfigDefault = require('./fixtures/main/webpack.config.js')

test.before(async (t) => {
  const modernTransforms = require.resolve('../src/buildtime/sourceTransforms')
  t.falsy(require.cache[modernTransforms])
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
  t.falsy(require.cache[modernTransforms])
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

test('webpack/hack/mismatched-curlies rejects invalid legacy transformations', async (t) => {
  const error = await t.throwsAsync(
    scaffold({
      ...webpackConfigDefault,
      entry: {
        hack4: './hack4.js',
      },
    })
  )

  t.regex(error.compilationErrors[0].message, /^E_VALIDATION/)
})

test('webpack/hack/mismatched-curlies works with evasive transforms', async (t) => {
  const build = await scaffold({
    ...webpackConfigDefault.makeConfig({ evasiveTransforms_experimental: true }),
    entry: {
      hack4: './hack4.js',
    },
  })

  t.notThrows(() => runScriptWithSES(build.snapshot['/dist/hack4.js'], {}))
})
