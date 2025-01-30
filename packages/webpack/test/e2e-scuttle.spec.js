// eslint-disable-next-line ava/use-test
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

const test = /** @type {import('ava').TestFn<ScuttlingTestContext>} */(ava)
const path = require('node:path')
// eslint-disable-next-line ava/no-import-test-files
const { scaffold, runScriptWithSES } = require('./scaffold.js')
const {makeConfig} = require('./fixtures/main/webpack.config.js')

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
  await t.notThrowsAsync(async () => {
    t.context.build = await scaffold(webpackConfig)
    t.context.bundle = t.context.build.snapshot['/dist/app.js']
    t.context.globalThis = runScriptWithSES(t.context.bundle, globals).context
  }, 'Expected the build to succeed')
}

test(`webpack/scuttled - hosting globalThis's environment is not scuttled`, async (t) => {
  await scuttle(t)
  t.notThrows(() => {
    const global = t.context.globalThis
    Object.getOwnPropertyNames(global).forEach(name => global[name])
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
  await scuttle(t, {enabled: true, exceptions: ['Function']})
  t.notThrows(() => {
    t.is(new t.context.globalThis.Function('return 1')(), 1)
  }, 'Unexpected error in scenario')
})

test(`webpack/scuttled - provided scuttlerName successfully invoked defined scuttlerFunc`, async (t) => {
  const scuttlerName = 'SCUTTLER';
  await scuttle(t, {
    enabled: true,
    scuttlerName,
  }, {
    [scuttlerName]: (globalRef, scuttle) => {
      t.context.scuttler_func_called = true
      scuttle(globalRef)
    }
  })
  t.true(t.context.scuttler_func_called);
})
