const test = /** @type {import('ava').TestFn} */ (require('ava'))
const { scaffold, runScript } = require('./scaffold.js')
const { makeConfig } = require('./fixtures/main/webpack.config.js')
const path = require('node:path')

test('webpack/static-shims - bundle runs and uses static shims', async (t) => {
  const webpackConfig = makeConfig({
    inlineLockdown: /app/,
    staticShims_experimental: [
      path.join(__dirname, 'fixtures/static-shims/shim-before.js'),
      path.join(__dirname, 'fixtures/static-shims/shim-lockdown.js'),
    ],
  })
  webpackConfig.mode = 'development'

  const build = await scaffold(webpackConfig)

  t.notThrows(() => {
    // TODO: switch to runChunks
    runScript(
      build.snapshot['/dist/app.js'] +
        `
    ;;
      if(!globalThis.SHIM_WORKS) throw new Error('expected basic shim to work');
      if(!globalThis.Promise.LOCKDOWN_SHIM_WORKS) throw new Error('expected lockdown shim to work');
`
    )
  })
})

test('webpack/static-shims - staticShims via runtimeConfigurationPerChunk_experimental', async (t) => {
  const webpackConfig = makeConfig({
    inlineLockdown: /app/,
    runtimeConfigurationPerChunk_experimental: (chunk) => {
      if (chunk.name === 'app') {
        return {
          staticShims: [
            path.join(__dirname, 'fixtures/static-shims/shim-before.js'),
            path.join(__dirname, 'fixtures/static-shims/shim-lockdown.js'),
          ],
        }
      }
    },
  })
  webpackConfig.entry.bpp = './simple.js'
  webpackConfig.mode = 'development'

  const build = await scaffold(webpackConfig)

  t.notThrows(() => {
    // TODO: switch to runChunks
    runScript(
      build.snapshot['/dist/app.js'] +
        `
    ;;
      if(!globalThis.SHIM_WORKS) throw new Error('expected basic shim to work');
      if(!globalThis.Promise.LOCKDOWN_SHIM_WORKS) throw new Error('expected lockdown shim to work');
`
    )
  })
  t.throws(
    () => {
      // TODO: switch to runChunks
      runScript(
        build.snapshot['/dist/bpp.js'] +
          `
    ;;
      if(!globalThis.SHIM_WORKS) throw new Error('expected basic shim to work');
`
      )
    },
    { message: 'expected basic shim to work' }
  )
})
