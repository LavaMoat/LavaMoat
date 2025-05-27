const test = /** @type {import('ava').TestFn} */ (require('ava'))
const { scaffold, runScriptWithSES } = require('./scaffold.js')
const { makeConfig } = require('./fixtures/main/webpack.config.js')

test.before(async (t) => {
  // Test with allowed globals
  const webpackConfigAllowed = makeConfig({
    generatePolicy: false,
    policy: {
      resources: {
        'globals-package': {
          globals: {
            console: true,
            top: true,
            parent: true,
          },
        },
      },
    },
  })
  const configAllowed = {
    ...webpackConfigAllowed,
    entry: {
      app: './globals.js',
    },
    mode: 'development',
  }

  // Test with restricted globals
  const webpackConfigRestricted = makeConfig({
    generatePolicy: false,
    policy: {
      resources: {
        'globals-package': {
          globals: {
            console: true,
            top: false,
            parent: false,
          },
        },
      },
    },
  })
  const configRestricted = {
    ...webpackConfigRestricted,
    entry: {
      app: './globals.js',
    },
    mode: 'development',
    target: 'web',
  }

  // Build both versions
  await t.notThrowsAsync(async () => {
    t.context.buildAllowed = await scaffold(configAllowed)
  }, 'Expected the allowed globals build to succeed')

  await t.notThrowsAsync(async () => {
    t.context.buildRestricted = await scaffold(configRestricted)
  }, 'Expected the restricted globals build to succeed')

  t.context.bundleAllowed = t.context.buildAllowed.snapshot['/dist/app.js']
  t.context.bundleRestricted =
    t.context.buildRestricted.snapshot['/dist/app.js']
})

test('webpack/globals - allowing other realm names works', (t) => {
  t.notThrows(() => {
    runScriptWithSES(t.context.bundleAllowed, {
      console,
      top: {},
      parent: {},
    })
  }, 'Should run without errors when globals are allowed')
})

test('webpack/globals - cannot reach disallowed realm references', (t) => {
  t.throws(
    () => {
      runScriptWithSES(t.context.bundleRestricted, {
        console,
        top: {},
        parent: {},
      })
    },
    { message: /\.top should not be undefined/ },
    'Should throw when globals are restricted'
  )
})
