const test = /** @type {import('ava').TestFn} */ (require('ava'))
const {
  scaffold,
  runScriptWithSES,
  runScript,
  defaultGlobalsForRunScript,
} = require('./scaffold.js')
const LavaMoatPlugin = require('../src/plugin.js')
const { makeConfig } = require('./fixtures/main/webpack.config.js')

test.before(async (t) => {
  const webpackConfig = makeConfig({
    generatePolicy: false,
    policy: { resources: {} },
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
    optimization: {
      splitChunks: {
        maxSize: 24,
        minSize: 1,
      },
      runtimeChunk: {
        name: (chunk) => {
          if (chunk.name === 'bootstrap') return false
          return 'runtime'
        },
      },
    },
    module: {
      rules: [
        {
          issuerLayer: 'bootstrap',
          use: LavaMoatPlugin.exclude,
        },
        {
          dependency: 'url',
          type: 'asset/resource',
        },
      ],
    },
    experiments: {
      layers: true,
    },
  }

  await t.notThrowsAsync(async () => {
    t.context.build = await scaffold(config)
  }, 'Expected the build to succeed')

  t.context.bundleApp = t.context.build.snapshot['/dist/app.js']
  t.context.bundleBootstrap = t.context.build.snapshot['/dist/bootstrap.js']
})

test('webpack/layers - app bundle runs with lavamoat', (t) => {
  t.notThrows(() => {
    runScriptWithSES(t.context.bundleApp, { console })
  }, 'Should run app bundle without errors')
})

test('webpack/layers - bootstrap bundle runs without lavamoat', (t) => {
  t.notThrows(() => {
    // Not using SES here as bootstrap should not be wrapped in LavaMoat
    runScript(t.context.bundleBootstrap, {
      ...defaultGlobalsForRunScript,
      console,
    })
  }, 'Should run bootstrap bundle without errors')
})
