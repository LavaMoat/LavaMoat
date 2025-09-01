const test = /** @type {import('ava').TestFn} */ (require('ava'))
const { scaffold, runScript } = require('./scaffold.js')
const { makeConfig } = require('./fixtures/main/webpack.config.js')
const path = require('path')

test.before(async (t) => {
  const webpackConfig = makeConfig({
    inlineLockdown: /app/,
    staticShims_experimental: [
      path.join(__dirname, 'fixtures/static-shims/shim-before.js'),
      path.join(__dirname, 'fixtures/static-shims/shim-lockdown.js'),
    ],
  })
  webpackConfig.mode = 'development'

  await t.notThrowsAsync(async () => {
    t.context.build = await scaffold(webpackConfig)
  }, 'Expected the build to succeed')
  t.context.bundle = t.context.build.snapshot['/dist/app.js']
})

test('webpack/static-shims - bundle runs and uses static shims', (t) => {
  t.notThrows(() => {
    runScript(
      t.context.bundle +
        `
    ;;
      assert(globalThis.SHIM_WORKS, 'expected basic shim to work');
      assert(globalThis.Promise.LOCKDOWN_SHIM_WORKS, 'expected lockdown shim to work');
`
    )
  })
})
