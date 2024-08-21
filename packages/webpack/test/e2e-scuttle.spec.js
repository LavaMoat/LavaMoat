const test = require('ava')
const path = require('node:path')
// eslint-disable-next-line ava/no-import-test-files
const { scaffold, runScriptWithSES } = require('./scaffold.js')
const {makeConfig} = require('./fixtures/main/webpack.config.js')

const err = (intrinsic) =>
  'LavaMoat - property "' +
  intrinsic +
  '" of globalThis is inaccessible under ' +
  'scuttling mode. To learn more visit https://github.com/LavaMoat/LavaMoat/pull/360.'

test.before(async (t) => {
  const webpackConfigDefault = makeConfig({
    scuttleGlobalThis: {
      enabled: true,
      exceptions: ['JSON'],
      scuttlerName: 'SCUTTLER',
    },
    generatePolicy: true,
    emitPolicySnapshot: true,
    diagnosticsVerbosity: 1,
    policyLocation: path.resolve(__dirname, 'fixtures/main/policy-write'),
  })
  const webpackConfig = {
    ...webpackConfigDefault,
    entry: {
      app: './simple.js',
    },
  }
  await t.notThrowsAsync(async () => {
    t.context.build = await scaffold(webpackConfig)
  }, 'Expected the build to succeed')
  t.context.bundle = t.context.build.snapshot['/dist/app.js']
  t.context.globalThis = runScriptWithSES(
    t.context.bundle, { SCUTTLER: (globalRef, scuttle) => {
        t.context.scuttler_func_called = true
        scuttle(globalRef)
      }
    }
  ).context
})

test('webpack/scuttled - dist shape', (t) => {
  t.snapshot(Object.keys(t.context.build.snapshot))
})

test('webpack/scuttled - hosting globalThis\'s "Function" is scuttled', (t) => {
  try {
    t.context.globalThis.Function
  } catch (e) {
    t.truthy(
      e.message === err('Function')
    )
  }
})

test('webpack/scuttled - hosting globalThis\'s "JSON" is scuttled excepted', (t) => {
  t.truthy(t.context.globalThis.JSON.stringify('a') === '"a"');
})

test('webpack/scuttled - provided scuttlerName successfully invoked defined scuttlerFunc', (t) => {
  t.truthy(t.context.scuttler_func_called);
})
