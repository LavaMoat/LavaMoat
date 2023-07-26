const test = require('ava')

const {
  createBundleFromEntry,
  evalBundle,
  createBundleForScenario,
  runScenario,
} = require('./util')

const {
  createScenarioFromScaffold,
  autoConfigForScenario,
  runAndTestScenario,
} = require('lavamoat-core/test/util')

test('basic - browserify bundle doesnt inject global', async (t) => {
  const bundle = await createBundleFromEntry(__dirname + '/fixtures/global.js')
  const browserifyGlobalPolyfill = 'typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {}'
  const hasGlobalInjection = bundle.includes(browserifyGlobalPolyfill)
  t.false(hasGlobalInjection, 'did not inject "global" ref')
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
  t.false(hasGlobalInjection, 'did not inject "global" ref')
})

test('basic - lavamoat policy and bundle', async (t) => {
  const scenario = createScenarioFromScaffold({
    // bundle works
    defineOne: () => {
      module.exports = require('two')()
    },
    defineTwo: () => {
      module.exports = () => location.href
    },
  })
  await autoConfigForScenario({ scenario })
  const { bundleForScenario } = await createBundleForScenario({ scenario })
  
  t.true(bundleForScenario.includes('"location.href":true'), 'prelude includes href policy')

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
    opts: { includePrelude: false },
  })

  await autoConfigForScenario({ scenario })
  const { bundleForScenario } = await createBundleForScenario({ scenario })

  let didCallLoadBundle = false
  const testGlobal = {
    LavaPack: { loadBundle: () => {
      didCallLoadBundle = true 
    } },
  }
  evalBundle(bundleForScenario, testGlobal)

  t.true(didCallLoadBundle)
})
