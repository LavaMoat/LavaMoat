const test = /** @type {import('ava').TestFn} */ (require('ava'))
const { scaffold, runScriptWithSES } = require('./scaffold.js')
const { makeConfig } = require('./fixtures/main/webpack.config.js')

test('webpack/repairs - MessageEvent repair is applied when in use', async (t) => {
  const webpackConfigAllowed = makeConfig({
    generatePolicy: false,
    policy: {
      resources: {
        'message-package': {
          globals: {
            console: true,
            MessageEvent: true,
          },
        },
      },
    },
  })
  const webpackConfig = {
    ...webpackConfigAllowed,
    entry: {
      app: './src/repairs.js',
    },
    mode: 'development',
  }

  await t.notThrowsAsync(async () => {
    t.context.build = await scaffold(webpackConfig)
  }, 'Expected the build to succeed')

  const mock = `
    globalThis.MessageEvent = class MessageEvent {
      get source() {
        return globalThis
      }
    };
  `

  t.true(
    t.context.build.snapshot['/dist/app.js'].includes('exports.MessageEvent'),
    'Expected MessageEvent repair to be included in the bundle'
  )

  t.notThrows(() => {
    runScriptWithSES(mock + t.context.build.snapshot['/dist/app.js'], {
      console,
    })
  }, 'Expected the script to run without throwing an error')
})

test('webpack/repairs - MessageEvent repair is not included when not in use', async (t) => {
  const webpackConfigAllowed = makeConfig({
    generatePolicy: false,
    policy: {
      resources: {
        'message-package': {
          globals: {
            console: true,
          },
        },
      },
    },
  })
  const webpackConfig = {
    ...webpackConfigAllowed,
    entry: {
      app: './src/repairs.js',
    },
    mode: 'development',
  }

  await t.notThrowsAsync(async () => {
    t.context.build = await scaffold(webpackConfig)
  }, 'Expected the build to succeed')

  t.false(
    t.context.build.snapshot['/dist/app.js'].includes('exports.MessageEvent'),
    'Expected MessageEvent repair to not be included in the bundle'
  )
})
