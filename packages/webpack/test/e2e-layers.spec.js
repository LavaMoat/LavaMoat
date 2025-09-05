const test = /** @type {import('ava').TestFn} */ (require('ava'))
const { scaffold, runChunksWithSES, runScript } = require('./scaffold.js')
const LavaMoatPlugin = require('../src/plugin.js')
const { makeConfig } = require('./fixtures/main/webpack.config.js')

test.before(async (t) => {
  const webpackConfig = makeConfig({
    generatePolicy: false,
    policy: {
      resources: {
        'commonjs-package': {
          packages: {
            'umd-package': true,
          },
        },
        'umd-package': {
          globals: {
            define: true,
          },
        },
      },
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
    t.context.build = await scaffold(config, { writeFS: false })
  }, 'Expected the build to succeed')
})

test('webpack/path-moduleId - bundle files complete', (t) => {
  // Note '/dist/4892327f4fdaee1a826b.js' is not actually a chunk, but an asset that gets emitted from the URL constructor
  t.snapshot(Object.keys(t.context.build.snapshot))
})

test('webpack/path-moduleId - app bundle runs with lavamoat', (t) => {
  t.notThrows(() => {
    runChunksWithSES([
      t.context.build.snapshot['/dist/runtime.js'],
      t.context.build.snapshot['/dist/app.js'],
    ])
  }, 'Should run app bundle without errors')
})

test('webpack/path-moduleId - bootstrap bundle runs without lavamoat', (t) => {
  t.notThrows(() => {
    // Not using SES here as bootstrap should not be wrapped in LavaMoat
    runScript(t.context.build.snapshot['/dist/bootstrap.js'])
  }, 'Should run bootstrap bundle without errors')
})
