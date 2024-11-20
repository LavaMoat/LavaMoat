const test = require('ava')
const path = require('node:path')
// eslint-disable-next-line ava/no-import-test-files
const { scaffold, runScriptWithSES } = require('./scaffold.js')
const { makeConfig } = require('./fixtures/main/webpack.config.js')

test('webpack/hack/tampering - tampering works by cjs spec', async (t) => {
  const webpackConfig = makeConfig({
    generatePolicy: true,
    policyLocation: path.resolve(__dirname, 'fixtures/main/policy-tamper'),
    diagnosticsVerbosity: 1,
  })
  webpackConfig.entry = {
    hack: './hack-tamper.js',
  }
  await t.notThrowsAsync(async () => {
    t.context.build = await scaffold(webpackConfig)
  }, 'Expected the build to succeed')

  t.throws(
    () => {
      runScriptWithSES(t.context.build.snapshot['/dist/hack.js'])
    },
    { message: /tampered/ }
  )
})

test('webpack/hack/tampering - tampering is prevented with config', async (t) => {
  const webpackConfig = makeConfig({
    generatePolicy: true,
    policyLocation: path.resolve(__dirname, 'fixtures/main/policy-tamper'),
    diagnosticsVerbosity: 1,
    preventTampering: 'moderate'
  })
  webpackConfig.entry = {
    hack: './hack-tamper.js',
  }
  await t.notThrowsAsync(async () => {
    t.context.build = await scaffold(webpackConfig)
  }, 'Expected the build to succeed')

  t.notThrows(() => {
    runScriptWithSES(t.context.build.snapshot['/dist/hack.js'])
  })
})

test('webpack/hack/tampering - tampering is prevented with config - strict', async (t) => {
  const webpackConfig = makeConfig({
    generatePolicy: true,
    policyLocation: path.resolve(__dirname, 'fixtures/main/policy-tamper'),
    diagnosticsVerbosity: 1,
    preventTampering: 'strict'
  })
  webpackConfig.entry = {
    hack: './hack-tamper.js',
  }
  await t.notThrowsAsync(async () => {
    t.context.build = await scaffold(webpackConfig)
  }, 'Expected the build to succeed')

  t.notThrows(() => {
    runScriptWithSES(t.context.build.snapshot['/dist/hack.js'])
  })
})
