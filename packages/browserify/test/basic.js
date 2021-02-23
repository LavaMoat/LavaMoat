const test = require('ava')

const { generatePrelude } = require('../src/index')
const {
  createBundleFromEntry,
  evalBundle,
  createBundleForScenario,
  runScenario
} = require('./util')

const {
  createScenarioFromScaffold,
  autoConfigForScenario,
  runAndTestScenario
} = require('lavamoat-core/test/util')

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
  t.falsy(hasGlobalInjection)
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

  t.truthy(bundleForScenario.includes('"location.href":true'))
  t.truthy(bundleForScenario.includes(prelude))

  const testHref = 'https://funky.town.gov/yolo?snake=yes'
  scenario.context = { location: { href: testHref } }
  scenario.expectedResult = testHref
  await runAndTestScenario(t, scenario, runScenario)
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

  t.truthy(!bundleForScenario.includes(prelude), 'bundle DOES NOT include prelude')

  let didCallLoadBundle = false
  const testGlobal = {
    LavaMoat: { loadBundle: () => { didCallLoadBundle = true } }
  }
  evalBundle(bundleForScenario, testGlobal)

  t.truthy(didCallLoadBundle)
})
