const test = /** @type {import('ava').TestFn} */ (require('ava'))
const {
  scaffold,
  runScriptWithSES,
  runScript,
  getDefaultGlobalsForRunScript,
} = require('./scaffold.js')
const LavaMoatPlugin = require('../src/plugin.js')
const { makeConfig } = require('./fixtures/main/webpack.config.js')

/**
 * Concatenates chunks to pretend they have loaded successfully, avoids attempts
 * by webpack to dynamically load
 *
 * @param {string[]} chunks
 * @returns
 */
function pretendLoadingChunks(chunks) {
  return chunks.join('\n;')
}

// It's not actually a chunk, but an asset that gets emitted from the URL
// const COMMON_CHUNK_FILE = '/dist/4892327f4fdaee1a826b.js'

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
})

test('webpack/layers - bundle files complete', (t) => {
  t.snapshot(Object.keys(t.context.build.snapshot))
})

test('webpack/layers - app bundle runs with lavamoat', (t) => {
  t.notThrows(() => {
    runScriptWithSES(
      pretendLoadingChunks([
        t.context.build.snapshot['/dist/runtime.js'],
        // t.context.build.snapshot[COMMON_CHUNK_FILE], // the chunk gets inlined in both layers separately. Not sure how to fix that yet
        t.context.build.snapshot['/dist/app.js'],
      ]),
      { console }
    )
  }, 'Should run app bundle without errors')
})

test('webpack/layers - bootstrap bundle runs without lavamoat', (t) => {
  t.notThrows(() => {
    // Not using SES here as bootstrap should not be wrapped in LavaMoat
    runScript(
      pretendLoadingChunks([
        // t.context.build.snapshot[COMMON_CHUNK_FILE], // the chunk gets inlined in both layers separately. Not sure how to fix that yet
        t.context.build.snapshot['/dist/bootstrap.js'],
      ]),
      {
        ...getDefaultGlobalsForRunScript(),
        console,
      }
    )
  }, 'Should run bootstrap bundle without errors')
})
