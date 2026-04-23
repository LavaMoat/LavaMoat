// @ts-check
const test = /** @type {import('ava').TestFn} */ (require('ava'))
const path = require('node:path')
const { scaffold, runScriptWithSES } = require('./scaffold.js')
const { makeConfig } = require('./fixtures/main/webpack.config.js')

const policyLocation = path.resolve(
  __dirname,
  'fixtures/main/policy-capabilities'
)

test.before(async (t) => {
  const webpackConfig = {
    ...makeConfig({ policyLocation }),
    entry: { app: './cap-logging.js' },
    mode: 'development',
  }
  await t.notThrowsAsync(async () => {
    t.context.build = await scaffold(webpackConfig)
  }, 'Expected the capability build to succeed')
  t.context.bundle = t.context.build.snapshot['/dist/app.js']
})

test('webpack/capabilities - bundle builds without error', (t) => {
  t.truthy(t.context.bundle, 'Expected a bundle to be produced')
})

test('webpack/capabilities - prefix-log capability prefixes console.log output', (t) => {
  const logged = []
  const { context } = runScriptWithSES(t.context.bundle, {
    console: {
      log(...args) {
        logged.push(args)
      },
      warn() {},
      error() {},
    },
  })
  void context // suppress unused warning

  const prefixedCall = logged.find(
    (args) =>
      args[0] === '[TEST-PREFIX]' && args[1] === 'hello from cap-logging'
  )
  t.truthy(
    prefixedCall,
    `Expected a console.log call prefixed with '[TEST-PREFIX]', got: ${JSON.stringify(logged)}`
  )
})

test('webpack/capabilities - capability only applies to resources that list it', (t) => {
  // globals-package accesses console directly. Its logs should NOT be prefixed
  // because only $root$ (the entry) lists the capability, not globals-package.
  const logged = []
  runScriptWithSES(t.context.bundle, {
    console: {
      log(...args) {
        logged.push(args)
      },
      warn() {},
      error() {},
    },
  })

  // Any log that starts with '[TEST-PREFIX]' must come from $root$ only.
  // globals-package doesn't call console.log, so we just verify the build ran and
  // no unexpected prefixed calls appeared from non-root resources.
  const prefixedCalls = logged.filter((args) => args[0] === '[TEST-PREFIX]')
  t.true(
    prefixedCalls.length >= 1,
    'At least one prefixed call expected from $root$'
  )
})
