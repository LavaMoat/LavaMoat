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
  await autoConfigForScenario({ scenario })
  const { bundleForScenario } = await createBundleForScenario({ scenario })
  const hasGlobalInjection = bundleForScenario.includes('typeof global !== \\"undefined\\" ? global :')
  scenario.checkResult(t, hasGlobalInjection, scenario, 'falsy')
})

test('basic - lavamoat policy and bundle', async (t) => {
  const scenario = createScenarioFromScaffold({
    // bundle works
    defineOne: () => {
      module.exports = require('two')()
    },
    defineTwo: () => {
      module.exports = () => location.href
    }
  })
  await autoConfigForScenario({ scenario })
  const { bundleForScenario } = await createBundleForScenario({ scenario })
  const prelude = generatePrelude()

  scenario.checkResult(t, bundleForScenario.includes('"location.href":true'), scenario, 'truthy')
  scenario.checkResult(t, bundleForScenario.includes(prelude), scenario, 'truthy')

  const testHref = 'https://funky.town.gov/yolo?snake=yes'
  scenario.context = { location: { href: testHref } }
  const testResult = await runScenario({ scenario })
  scenario.expectedResult = testHref

  scenario.checkResult(t, testResult, scenario)
})

test('basic - lavamoat bundle without prelude', async (t) => {
  const scenario = createScenarioFromScaffold({
    // bundle works
    defineOne: () => {
      module.exports = require('two')()
    },
    defineTwo: () => {
      module.exports = () => location.href
    },
    opts: { includePrelude: false }
  })

  await autoConfigForScenario({ scenario })
  const { bundleForScenario } = await createBundleForScenario({ scenario })
  const prelude = generatePrelude()

  scenario.checkResult(t, !bundleForScenario.includes(prelude), scenario, 'truthy')

  let didCallLoadBundle = false
  const testGlobal = {
    LavaMoat: { loadBundle: () => { didCallLoadBundle = true } }
  }
  evalBundle(bundleForScenario, testGlobal)

  scenario.checkResult(t, didCallLoadBundle, scenario, 'truthy')
})
