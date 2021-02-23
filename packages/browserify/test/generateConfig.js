const test = require('ava')

const {
  autoConfigForScenario
} = require('./util')
const {
  createScenarioFromScaffold
} = require('lavamoat-core/test/util')

test('generateConfig - empty policy', async (t) => {
  const scenario = createScenarioFromScaffold({
    defineEntry: () => {},
    defaultConfig: false
  })
  const policy = await autoConfigForScenario({ scenario })
  t.deepEqual(policy, { resources: {} }, 'policy matches expected')
})

test('generateConfig - basic policy', async (t) => {
  const scenario = createScenarioFromScaffold({
    defineOne: () => { module.exports = global.two },
    defaultConfig: false
  })

  const policy = await autoConfigForScenario({ scenario })
  t.deepEqual(policy, {
    resources: {
      one: {
        globals: {
          two: true
        }
      }
    }
  })
})

test('generateConfig - ignore various refs', async (t) => {
  const scenario = createScenarioFromScaffold({
    defineOne: () => {
      const js = [this]
      const ignored = [global, require, module, exports, arguments]
      const globalRefs = [typeof globalThis, typeof self, typeof window]
      global.xyz
    },
    defaultConfig: false
  })
  const policy = await autoConfigForScenario({ scenario })
  t.deepEqual(policy, {
    resources: {
      one: {
        globals: {
          xyz: true
        }
      }
    }
  })
})


test('generateConfig - policy ignores global refs', async (t) => {
  const scenario = createScenarioFromScaffold({
    defineOne: () => {
      const href = window.location.href
      const xhr = new window.XMLHttpRequest()
    },
    defaultConfig: false
  })
  const policy = await autoConfigForScenario({ scenario })
  t.deepEqual(policy, {
    resources: {
      one: {
        globals: {
          'location.href': true,
          XMLHttpRequest: true
        }
      }
    }
  })
})

test('generateConfig - policy ignores global refs when properties are not accessed', async (t) => {
  const scenario = createScenarioFromScaffold({
    defineOne: () => {
      typeof window !== undefined
    },
    defaultConfig: false
  })
  const policy = await autoConfigForScenario({ scenario })
  t.deepEqual(policy, {
    resources: {}
  })
})

test('generateConfig - policy ignores global refs accessed with whitelist items', async (t) => {
  const scenario = createScenarioFromScaffold({
    defineOne: () => {
      window.Object === Object
    },
    defaultConfig: false,
    expectedResult: {
      resources: {}
    }
  })
  const policy = await autoConfigForScenario({ scenario })
  t.deepEqual(policy, {
    resources: {}
  })
})