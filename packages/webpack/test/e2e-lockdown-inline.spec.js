const test = require('ava')
const { scaffold, runScript } = require('./scaffold.js')
const { makeConfig } = require('./fixtures/main/webpack.config.js')

test.before(async (t) => {
  const webpackConfig = makeConfig({
    inlineLockdown: /app/,
  })
  await t.notThrowsAsync(async () => {
    t.context.build = await scaffold(webpackConfig)
  }, 'Expected the build to succeed')
  t.context.bundle = t.context.build.snapshot['/dist/app.js']
})

test('webpack/lockdown-inline - bundle runs under lockdown', (t) => {
  t.notThrows(() => {
    runScript(
      t.context.bundle +
        `
    ;;
    if (!Object.isFrozen(Object.prototype)) {
      throw Error('expected Object.prototype to be frozen');
    }
    if (!Compartment || !harden) {
      throw Error('expected SES globals to be available');
    }`
    )
  })
})
