 
const { default: ava } = require('ava')

/**
 * Test context object for our tests
 *
 * @typedef ScuttlingTestContext
 * @property {string} build
 * @property {string} bundle
 * @property {object} globalThis
 * @property {boolean} scuttler_func_called
 */

const test = /** @type {import('ava').TestFn<ScuttlingTestContext>} */ (ava)
const path = require('node:path')
 
const { scaffold, runScriptWithSES } = require('./scaffold.js')
const { makeConfig } = require('./fixtures/main/webpack.config.js')

const err = (intrinsic) =>
  'LavaMoat - property "' +
  intrinsic +
  '" of globalThis is inaccessible under ' +
  'scuttling mode. To learn more visit https://github.com/LavaMoat/LavaMoat/pull/360.'

async function scuttle(t, scuttleGlobalThis, globals) {
  const webpackConfigDefault = makeConfig({
    scuttleGlobalThis,
    generatePolicy: true,
    diagnosticsVerbosity: 1,
    policyLocation: path.resolve(__dirname, 'fixtures/main/policy-scuttling'),
  })
  const webpackConfig = {
    ...webpackConfigDefault,
    entry: {
      app: './simple.js',
    },
  }
  // force webpack into creating chunks so that testing chunkApp globals is possible
  webpackConfig.optimization.runtimeChunk = 'single'
  // specify the chunk global namefor tests
  webpackConfig.output.chunkLoadingGlobal = 'webpackChunkTEST'

  await t.notThrowsAsync(async () => {
    t.context.build = await scaffold(webpackConfig)
    // Load both chunks effectively
    t.context.bundle =
      t.context.build.snapshot['/dist/runtime.js'] +
      t.context.build.snapshot['/dist/app.js']
    t.context.globalThis = runScriptWithSES(t.context.bundle, globals).context
  }, 'Expected the build to succeed')
}
async function scuttleViaRuntimeConf(t, scuttleGlobalThis, globals) {
  const webpackConfigDefault = makeConfig({
    generatePolicy: true,
    diagnosticsVerbosity: 1,
    policyLocation: path.resolve(__dirname, 'fixtures/main/policy-scuttling'),
    runtimeConfigurationPerChunk_experimental: (/*chunk*/) => {
      return {
        embeddedOptions: {
          scuttleGlobalThis,
        },
      }
    }

  })
  const webpackConfig = {
    ...webpackConfigDefault,
    entry: {
      app: './simple.js',
    },
  }
  // force webpack into creating chunks so that testing chunkApp globals is possible
  webpackConfig.optimization.runtimeChunk = 'single'
  // specify the chunk global namefor tests
  webpackConfig.output.chunkLoadingGlobal = 'webpackChunkTEST'

  await t.notThrowsAsync(async () => {
    t.context.build = await scaffold(webpackConfig)
    // Load both chunks effectively
    t.context.bundle =
      t.context.build.snapshot['/dist/runtime.js'] +
      t.context.build.snapshot['/dist/app.js']
    t.context.globalThis = runScriptWithSES(t.context.bundle, globals).context
  }, 'Expected the build to succeed')
}

test(`webpack/scuttled - hosting globalThis's environment is not scuttled`, async (t) => {
  await scuttle(t)
  t.notThrows(() => {
    const global = t.context.globalThis
    Object.getOwnPropertyNames(global).forEach((name) => global[name])
  }, 'Unexpected error in scenario')
})

test(`webpack/scuttled - hosting globalThis's "Function" is not scuttled`, async (t) => {
  await scuttle(t)
  t.notThrows(() => {
    t.is(new t.context.globalThis.Function('return 1')(), 1)
  }, 'Unexpected error in scenario')
})

test(`webpack/scuttled - hosting globalThis's "Function" is scuttled`, async (t) => {
  await scuttle(t, true)
  try {
    new t.context.globalThis.Function('1')()
  } catch (e) {
    t.true(e.message === err('Function'))
  }
})

test(`webpack/scuttled - hosting globalThis's "Function" is scuttled excepted`, async (t) => {
  await scuttle(t, { enabled: true, exceptions: ['Function'] })
  t.notThrows(() => {
    t.is(new t.context.globalThis.Function('return 1')(), 1)
  }, 'Unexpected error in scenario')
})

test(`webpack/scuttled - webpackChunk global is transparently added to exceptions`, async (t) => {
  await scuttle(t, { enabled: true, exceptions: ['Function'] })

  t.notThrows(() => {
    t.context.globalThis.webpackChunkTEST
  }, 'Unexpected error in scenario')
  t.truthy(t.context.globalThis.webpackChunkTEST)
})

test(`webpack/scuttled - webpackChunk global is transparently added to exceptions when configuration comes from runtimeConfigurationPerChunk`, async (t) => {
  await scuttleViaRuntimeConf(t, { enabled: true, exceptions: ['Function'] })

  t.notThrows(() => {
    // accessing the field, if scuttled, will call the getter that throws
    t.context.globalThis.webpackChunkTEST
  }, 'Unexpected error in scenario')
  t.truthy(t.context.globalThis.webpackChunkTEST)
})

test(`webpack/scuttled - webpackChunk global is transparently added to exceptions even when not specified 1`, async (t) => {
  await scuttle(t, { enabled: true })

  t.notThrows(() => {
    t.context.globalThis.webpackChunkTEST
  }, 'Unexpected error in scenario')
  t.truthy(t.context.globalThis.webpackChunkTEST)
})

test(`webpack/scuttled - webpackChunk global is transparently added to exceptions even when not specified 2`, async (t) => {
  await scuttle(t, true)

  t.notThrows(() => {
    t.context.globalThis.webpackChunkTEST
  }, 'Unexpected error in scenario')
  t.truthy(t.context.globalThis.webpackChunkTEST)
})

test(`webpack/scuttled - provided scuttlerName successfully invoked defined scuttlerFunc`, async (t) => {
  const scuttlerName = 'SCUTTLER'
  await scuttle(
    t,
    {
      enabled: true,
      scuttlerName,
    },
    {
      [scuttlerName]: (globalRef, scuttle) => {
        t.context.scuttler_func_called = true
        scuttle(globalRef)
      },
    }
  )
  t.true(t.context.scuttler_func_called)
})
