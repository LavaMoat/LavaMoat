const test = require('ava')
const { scaffold, runScriptWithSES } = require('./scaffold.js')
const { makeConfig } = require('./fixtures/main/webpack.config.js')

test.before(async (t) => {
  const webpackConfig = makeConfig({
    // TODO: replace hardcoded policy with generated one when isBuiltin gets implemented
    // generatePolicy: true,
    policy: {
      resources: {
        'nodejs-package': {
          builtin: {
            'node:fs': true,
          },
        },
      },
    },
    emitPolicySnapshot: true,
    diagnosticsVerbosity: 1,
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
})

test('webpack/node.js - bundle runs without throwing', (t) => {
  t.notThrows(() => {
    runScriptWithSES(t.context.bundle, { console, require })
  })
})
