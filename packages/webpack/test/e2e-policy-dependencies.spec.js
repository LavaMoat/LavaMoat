const test = require('ava')
const path = require('node:path')
// eslint-disable-next-line ava/no-import-test-files
const { scaffold, runScriptWithSES } = require('./scaffold.js')
const { makeConfig } = require('./fixtures/main/webpack.config.js')
const { isBuiltin } = require('node:module')

test.before(async (t) => {
  const webpackConfigDefault = makeConfig({
    generatePolicy: false,
    isBuiltin,
    emitPolicySnapshot: true,
    diagnosticsVerbosity: 1,
    policyLocation: path.resolve(
      __dirname,
      'fixtures/main/policy-dependencies'
    ),
  })
  const webpackConfig = {
    ...webpackConfigDefault,
    entry: {
      app: './dependency.js',
    },
    mode: 'development',
    target: 'node',
  }
  await t.notThrowsAsync(async () => {
    t.context.build = await scaffold(webpackConfig)
  }, 'Expected the build to succeed')
  t.context.bundle = t.context.build.snapshot['/dist/app.js']
})

test('webpack/dependency hacks - no hacks are successful', (t) => {
  t.notThrows(() => {
    runScriptWithSES(t.context.bundle, {
      console,
      require: (specifier) => `required builtin ${specifier}`,
    })
  })
})
