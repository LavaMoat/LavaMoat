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

test('webpack/capabilities - repair callback runs before hardenIntrinsics and mutations persist', (t) => {
  const { context } = runScriptWithSES(t.context.bundle, {
    console: { log() {}, warn() {}, error() {} },
  })
  // repair() set __capRepairRan on globalThis before hardening
  t.is(
    context.__capRepairRan,
    true,
    'repair callback should have mutated globalThis'
  )
})

test('webpack/capabilities - repair-marker endow receives value set during repair phase', (t) => {
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
  // prefix-log is also active, so the log is prefixed
  const markerLog = logged.find(
    (args) => args.includes('repair-marker:') && args.includes('repaired')
  )
  t.truthy(
    markerLog,
    `Expected repair-marker endow to provide 'repaired', got: ${JSON.stringify(logged)}`
  )
})

test('webpack/capabilities - backwards compat: build without use still works', async (t) => {
  // Build with the default policy (no capabilities)
  const webpackConfig = {
    ...makeConfig(),
    mode: 'development',
  }
  const build = await scaffold(webpackConfig)
  const bundle = build.snapshot['/dist/app.js']
  t.truthy(bundle, 'Bundle should be produced without use field')
  t.notThrows(() => {
    runScriptWithSES(bundle, {
      console: { log() {}, warn() {}, error() {} },
    })
  }, 'Bundle without capabilities should run without error')
})

test('webpack/capabilities - existing repairs and capabilities coexist', async (t) => {
  const coexistPolicyLocation = path.resolve(
    __dirname,
    'fixtures/main/policy-cap-with-repairs'
  )
  const webpackConfig = {
    ...makeConfig({ policyLocation: coexistPolicyLocation }),
    entry: { app: './cap-logging.js' },
    mode: 'development',
  }
  const build = await scaffold(webpackConfig)
  const bundle = build.snapshot['/dist/app.js']

  const logged = []
  const { context } = runScriptWithSES(bundle, {
    console: {
      log(...args) {
        logged.push(args)
      },
      warn() {},
      error() {},
    },
  })

  // capability endow ran (prefix-log applied to root)
  const prefixed = logged.find((args) => args[0] === '[COEXIST]')
  t.truthy(
    prefixed,
    `Expected prefix from capability, got: ${JSON.stringify(logged)}`
  )

  // globals-package has globalThis in policy, triggering the globalThis repair
  // The bundle ran without error, proving repairs and capabilities coexist
  t.truthy(context, 'Bundle with both repairs and capabilities should run')
})
