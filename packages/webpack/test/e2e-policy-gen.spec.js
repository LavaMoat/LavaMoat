const test = require('ava')
const { scaffold, runScriptWithSES } = require('./scaffold.js')
const { makeConfig } = require('./fixtures/main/webpack.config.js')
const path = require('node:path')
const LavaMoatPlugin = require('../src/plugin.js')

test.before(async (t) => {
  const webpackConfig = makeConfig({
    generatePolicy: true,
    emitPolicySnapshot: true,
    diagnosticsVerbosity: 1,
  })
  await t.notThrowsAsync(async () => {
    t.context.build = await scaffold(webpackConfig)
  }, 'Expected the build to succeed')
  t.context.bundle = t.context.build.snapshot['/dist/app.js']
})

test('webpack/policy-gen - policy shape', (t) => {
  t.snapshot(t.context.build.snapshot['/dist/policy-snapshot.json'])
})

test('webpack/policy-gen - bundle runs without throwing', (t) => {
  t.notThrows(() => {
    runScriptWithSES(t.context.bundle)
  })
})

test('webpack/policy-gen - handles excludes', async (t) => {
  const webpackConfig = makeConfig({
    generatePolicy: true,
    policyLocation: path.resolve(__dirname, 'fixtures/main/policy-excludes'),
    diagnosticsVerbosity: 1,
  })
  webpackConfig.entry = path.resolve(__dirname, 'fixtures/main/excludes.js')
  try {
    await scaffold(webpackConfig)
  } catch (e) {
    t.is(typeof e.compilationErrors, 'object')
    t.truthy(
      e.compilationErrors.some(
        (err) =>
          err.message.includes('Failed to inspect') &&
          err.message.includes('exclude loader')
      )
    )
    t.truthy(
      e.compilationErrors.some((err) =>
        err.message.includes('Module parse failed')
      )
    )
  }

  webpackConfig.module.rules.push({
    test: /invalid\.js$/,
    use: [LavaMoatPlugin.exclude],
  })

  try {
    await scaffold(webpackConfig)
  } catch (e) {
    t.is(typeof e.compilationErrors, 'object')
    t.falsy(
      e.compilationErrors.some((err) =>
        err.message.includes('Failed to inspect')
      )
    )
    t.truthy(
      e.compilationErrors.some((err) =>
        err.message.includes('Module parse failed')
      )
    )
  }
  t.pass()
})
