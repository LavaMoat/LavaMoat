const test = /** @type {import('ava').TestFn} */ (require('ava'))
const { scaffold, runScript } = require('./scaffold.js')
const LavaMoatPlugin = require('../src/plugin.js')
const { makeConfig } = require('./fixtures/main/webpack.config.js')

test.before(async (t) => {
  const webpackConfig = makeConfig({
    generatePolicy: false,
    runtimeConfigurationPerChunk_experimental: (chunk) => {
      if (chunk.name === 'bootstrap') {
        return {
          mode: 'null_unsafe',
        }
      }
    },
  })
  const config = {
    ...webpackConfig,
    entry: {
      app: './layers/app.js',
      bootstrap: {
        import: './layers/bootstrap.js',
        layer: 'bootstrap',
      },
    },
    mode: 'development',
    module: {
      rules: [
        {
          issuerLayer: 'bootstrap',
          use: LavaMoatPlugin.exclude,
        },
      ],
    },
    experiments: {
      layers: true,
    },
  }

  await t.notThrowsAsync(async () => {
    t.context.build = await scaffold(config, { writeFS: false })
  }, 'Expected the build to succeed')
})

test('webpack/null-runtime - bundle files complete', (t) => {
  t.snapshot(Object.keys(t.context.build.snapshot))
})
test('webpack/null-runtime - bundled bootstrap has runtime without lavamoat', (t) => {
  const bundle = t.context.build.snapshot['/dist/bootstrap.js']
  t.true(
    bundle.includes('/******/ 	__webpack_require__.m = __webpack_modules__'),
    'Expected the bundle to contain webpack runtime code'
  )
  t.notRegex(
    bundle,
    /_LM_/,
    'Expected the bundle to not contain LavaMoat runtime'
  )
  t.notRegex(
    bundle,
    /LAVAMOAT/,
    'Expected the bundle to not contain LavaMoat runtime'
  )
})

test('webpack/null-runtime - bootstrap bundle runs with null runtime', (t) => {
  t.notThrows(() => {
    // Not using SES here as bootstrap should not be wrapped in LavaMoat
    runScript(t.context.build.snapshot['/dist/bootstrap.js'])
  }, 'Should run bootstrap bundle without errors')
})
