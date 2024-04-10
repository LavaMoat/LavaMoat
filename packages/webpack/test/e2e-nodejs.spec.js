const test = require('ava')
const { scaffold, runScriptWithSES } = require('./scaffold.js')
const { makeConfig } = require('./fixtures/main/webpack.config.js')
const path = require('node:path')

test.before(async (t) => {
  const webpackConfig = makeConfig({
    generatePolicy: true,
    emitPolicySnapshot: true,
    diagnosticsVerbosity: 1,
    policyLocation: path.resolve(__dirname, 'fixtures/main/policy-node'),
  })
  webpackConfig.target = 'node'
  webpackConfig.mode = 'development'
  webpackConfig.entry = {
    app: './node.js',
  }
  await t.notThrowsAsync(async () => {
    t.context.build = await scaffold(webpackConfig)
  }, 'Expected the build to succeed')
  t.context.bundle = t.context.build.snapshot['/dist/app.js']
})

test('webpack/node.js - policy shape', (t) => {
  t.snapshot(t.context.build.snapshot['/dist/policy-snapshot.json'])
  t.snapshot(t.context.build.snapshot['/dist/app.js'])
})

test('webpack/node.js - bundle runs without throwing', (t) => {
  t.notThrows(() => {
    runScriptWithSES(t.context.bundle, {console, require})
  })
})
