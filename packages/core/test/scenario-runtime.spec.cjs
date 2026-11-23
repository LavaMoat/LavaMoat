// @ts-check
/**
 * Unit tests for the scenario reference runtime.
 *
 * Validates:
 *
 * 1. `packageNameForPath` utility
 * 2. The Worker loader for a small selection of representative fixtures
 * 3. Negative controls – three fixtures that are _expected_ to fail
 */

'use strict'

const { default: test } = require('ava')
const path = require('node:path')

const {
  packageNameForPath,
} = require('./scenario-runtime/package-name-for-path.cjs')
const { loadFixture } = require('./scenarios.cjs')
const { runScenario } = require('./util.cjs')

// Shared scenarios live in the published scenarios/ directory at package root.
const BUNDLE_WORKS = path.join(
  __dirname,
  '../scenarios/basic/bundle-works'
)
// Workspace node_modules for a scoped-package case (symlinked to packages/aa)
const WORKSPACE_NM = path.join(__dirname, '..', '..', '..', 'node_modules')

test('packageNameForPath – entry-point file returns $root$', (t) => {
  t.is(packageNameForPath(path.join(BUNDLE_WORKS, 'entry.js')), '$root$')
})

test('packageNameForPath – simple package', (t) => {
  t.is(
    packageNameForPath(
      path.join(BUNDLE_WORKS, 'node_modules', 'one', 'index.js')
    ),
    'one'
  )
})

test('packageNameForPath – scoped package', (t) => {
  // Uses @endo/compartment-mapper, a real non-symlinked dep in node_modules
  t.is(
    packageNameForPath(
      path.join(
        WORKSPACE_NM,
        '@endo',
        'compartment-mapper',
        'src',
        'archive-lite.js'
      )
    ),
    '@endo/compartment-mapper'
  )
})

// Shared scenarios are in the published scenarios/ directory at package root.
const SHARED = path.join(__dirname, '..', 'scenarios')
const CORE = path.join(__dirname, 'fixtures', 'scenarios', 'core')

test('loader – basic/bundle-works fixture passes', async (t) => {
  const scenario = loadFixture(path.join(SHARED, 'basic', 'bundle-works'))
  const result = /** @type {number} */ (await runScenario({ scenario }))
  // The fixture sums 1+2+552 across three packages → 555
  t.is(result, 555)
})

test('loader – circular-deps/multi-module-circular-deps fixture completes', async (t) => {
  const scenario = loadFixture(
    path.join(CORE, 'circular-deps', 'multi-module-circular-deps-dont-inf-loop')
  )
  // Just confirm it does not throw – the scenario expect is result:true
  const result = await runScenario({ scenario })
  t.truthy(result)
})

test('loader – builtin/basic-access fixture passes', async (t) => {
  const scenario = loadFixture(path.join(CORE, 'builtin', 'basic-access'))
  const result = await runScenario({ scenario })
  t.deepEqual(result, { abc: 123, xyz: null })
})

test('negative: package blocked from requiring a disallowed peer throws', async (t) => {
  const scenario = loadFixture(
    path.join(SHARED, 'config', 'disable-access-to-package')
  )
  await t.throwsAsync(() => runScenario({ scenario }), {
    message: /not in allowlist|not allowed/i,
  })
})

test('negative: scuttled global is inaccessible', async (t) => {
  const scenario = loadFixture(
    path.join(
      SHARED,
      'scuttle',
      'host-env-global-object-is-too-scuttled-to-work'
    )
  )
  await t.throwsAsync(() => runScenario({ scenario }), {
    message: /SES_UNHANDLED_REJECTION|inaccessible under scuttling mode/i,
  })
})

test('negative: policy config validation rejects invalid key', async (t) => {
  const scenario = loadFixture(
    path.join(SHARED, 'config', 'config-validation-fails-invalid-globals-key')
  )
  await t.throwsAsync(() => runScenario({ scenario }), {
    instanceOf: Error,
  })
})
