const test = require('ava')

const { generatePrelude } = require('../src/index')
const {
  createBundleFromEntry,
  evalBundle,
  createBundleForScenario,
  runScenario
} = require('./util')

const { createScenarioFromScaffold, autoConfigForScenario } = require('lavamoat-core/test/util')

test('basic - browserify bundle doesnt inject global', async (t) => {
  const bundle = await createBundleFromEntry(__dirname + '/fixtures/global.js')
  const browserifyGlobalPolyfill = 'typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {}'
  const hasGlobalInjection = bundle.includes(browserifyGlobalPolyfill)
  t.falsy(hasGlobalInjection, 'did not inject "global" ref')
})

test('basic - browserify bundle doesnt inject global in deps', async (t) => {
  const scenario = createScenarioFromScaffold({
    defineOne: () => {
      module.exports = require('two')
    },
    defineTwo: () => {
      module.exports = global
    },
  })
  await autoConfigForScenario(scenario)
  const { bundleForScenario } = await createBundleForScenario({ scenario })
  const hasGlobalInjection = bundleForScenario.includes('typeof global !== \\"undefined\\" ? global :')
  t.falsy(hasGlobalInjection, 'did not inject "global" ref')
})

test('basic - lavamoat config and bundle', async (t) => {
  const scenario = createScenarioFromScaffold({
    // bundle works
    defineOne: () => {
      module.exports = require('two')()
    },
    defineTwo: () => {
      module.exports = () => location.href
    }
  })
  await autoConfigForScenario(scenario)
  const { bundleForScenario } = await createBundleForScenario({ scenario })
  const prelude = generatePrelude()

  t.assert(bundbundleForScenariole.includes('"location.href":true'), 'prelude includes banana config')
  t.assert(bundleForScenario.includes(prelude), 'bundle includes expected prelude')

  const testHref = 'https://funky.town.gov/yolo?snake=yes'
  scenario.context = { location: { href: testHref } }
  const testResult = await runScenario({ scenario })

  t.is(testResult, testHref, 'test result matches expected')
})

test('basic - lavamoat bundle without prelude', async (t) => {
  const scenario = createScenarioFromScaffold({
    // bundle works
    defineOne: () => {
      module.exports = require('two')()
    },
    defineTwo: () => {
      module.exports = () => location.href
    }
  })

  await autoConfigForScenario(scenario)
  const { bundleForScenario } = await createBundleForScenario({ scenario, opts: { includePrelude: false } })
  const prelude = generatePrelude()

  t.assert(!bundleForScenario.includes(prelude), 'bundle DOES NOT include prelude')

  let didCallLoadBundle = false
  const testGlobal = {
    LavaMoat: { loadBundle: () => { didCallLoadBundle = true } }
  }
  evalBundle(bundleForScenario, testGlobal)
  t.assert(didCallLoadBundle, 'test result matches expected')
})
