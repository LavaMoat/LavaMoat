const test = require('ava')

const {
  autoConfigForScenario,
} = require('./util')
const {
  createScenarioFromScaffold,
} = require('lavamoat-core/test/util')

test('generatePolicy - empty policy', async (t) => {
  const scenario = createScenarioFromScaffold({
    defineEntry: () => {},
    defaultPolicy: false,
  })
  const policy = await autoConfigForScenario({ scenario })
  t.deepEqual(policy, { resources: {} }, 'policy matches expected')
})

test('generatePolicy - basic policy', async (t) => {
  const scenario = createScenarioFromScaffold({
    defineOne: () => {
      module.exports = global.two 
    },
    defaultPolicy: false,
  })

  const policy = await autoConfigForScenario({ scenario })
  t.deepEqual(policy, {
    resources: {
      one: {
        globals: {
          two: true,
        },
      },
    },
  })
})

test('generatePolicy - ignore various refs', async (t) => {
  const scenario = createScenarioFromScaffold({
    defineOne: () => {
      const js = [this]
      const ignored = [global, require, module, exports, arguments]
      const globalRefs = [typeof globalThis, typeof self, typeof window]
      global.xyz
    },
    defaultPolicy: false,
  })
  const policy = await autoConfigForScenario({ scenario })
  t.deepEqual(policy, {
    resources: {
      one: {
        globals: {
          xyz: true,
        },
      },
    },
  })
})


test('generatePolicy - policy ignores global refs', async (t) => {
  const scenario = createScenarioFromScaffold({
    defineOne: () => {
      const href = window.location.href
      const xhr = new window.XMLHttpRequest()
    },
    defaultPolicy: false,
  })
  const policy = await autoConfigForScenario({ scenario })
  t.deepEqual(policy, {
    resources: {
      one: {
        globals: {
          'location.href': true,
          XMLHttpRequest: true,
        },
      },
    },
  })
})

test('generatePolicy - policy ignores global refs when properties are not accessed', async (t) => {
  const scenario = createScenarioFromScaffold({
    defineOne: () => {
      typeof window !== undefined
    },
    defaultPolicy: false,
  })
  const policy = await autoConfigForScenario({ scenario })
  t.deepEqual(policy, {
    resources: {},
  })
})

test('generatePolicy - policy ignores global refs accessed with allowlist items', async (t) => {
  const scenario = createScenarioFromScaffold({
    defineOne: () => {
      window.Object === Object
    },
    defaultPolicy: false,
    expectedResult: {
      resources: {},
    },
  })
  const policy = await autoConfigForScenario({ scenario })
  t.deepEqual(policy, {
    resources: {},
  })
})

test('generatePolicy - policy endows "process" properly', async (t) => {
  const scenario = createScenarioFromScaffold({
    defineOne: () => {
      const x = process.nextTick
    },
    defaultPolicy: false,
    files: {
      'package.json': {
        content: `${JSON.stringify({
          dependencies: {
            one: '1.0.0',
            two: '1.0.0',
            three: '1.0.0',
          },
          // must include browserify so we know to find the builtin deps
          devDependencies: {
            'browserify': '^16.2.3',
          },
        })}`,
      },
    },
  })
  const policy = await autoConfigForScenario({ scenario })
  t.deepEqual(policy, {
    resources: {
      one: {
        packages: {
          'browserify>process': true,
        },
      },
      'browserify>process': {
        globals: {
          clearTimeout: true,
          setTimeout: true,
        },
      },
    },
  })
})
