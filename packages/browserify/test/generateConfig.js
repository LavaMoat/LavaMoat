const test = require('ava')

const {
  autoConfigForScenario
} = require('./util')
const {
  createScenarioFromScaffold
} = require('lavamoat-core/test/util')

test('generateConfig - empty config', async (t) => {
  const scenario = createScenarioFromScaffold({
    defineEntry: () => {},
    defaultConfig: false,
  })
  const config = await autoConfigForScenario({ scenario })
  t.deepEqual(config, { resources: {} }, 'config matches expected')
})

test('generateConfig - basic config', async (t) => {
  const scenario = createScenarioFromScaffold({
    defineOne: () => { module.exports = global.two },
    defaultConfig: false
  })
  const config = await autoConfigForScenario({ scenario })
  t.deepEqual(config, {
    resources: {
      one: {
        globals: {
          two: true
        }
      }
    }
  }, 'config matched expected')
})

test('generateConfig - ignore various refs', async (t) => {
  const scenario = createScenarioFromScaffold({
    defineOne: () => {
      const js = [this]
      const ignored = [global, require, module, exports, arguments]
      const globalRefs = [typeof globalThis, typeof self, typeof window]
      global.xyz
    },
    defaultConfig: false,
  })
  const config = await autoConfigForScenario({ scenario })
  t.deepEqual(config, {
    resources: {
      one: {
        globals: {
          xyz: true
        }
      }
    }
  }, 'config matched expected')
})


test('generateConfig - config ignores global refs', async (t) => {
  const scenario = createScenarioFromScaffold({
    defineOne: () => {
      const href = window.location.href
      const xhr = new window.XMLHttpRequest()
    },
    defaultConfig: false,
  })
  const config = await autoConfigForScenario({ scenario })
  t.deepEqual(config, {
    resources: {
      one: {
        globals: {
          'location.href': true,
          XMLHttpRequest: true
        }
      }
    }
  }, 'config matches expected')
})

test('generateConfig - config ignores global refs when properties are not accessed', async (t) => {
  const scenario = createScenarioFromScaffold({
    defineOne: () => {
      typeof window !== undefined
    },
    defaultConfig: false,
  })
  const config = await autoConfigForScenario({ scenario })
  t.deepEqual(config, {
    resources: {}
  }, 'config matches expected')
})

test('generateConfig - config ignores global refs accessed with whitelist items', async (t) => {
  const scenario = createScenarioFromScaffold({
    defineOne: () => {
      window.Object === Object
    },
    defaultConfig: false,
  })
  const config = await autoConfigForScenario({ scenario })
  t.deepEqual(config, {
    resources: {}
  }, 'config matches expected')
})