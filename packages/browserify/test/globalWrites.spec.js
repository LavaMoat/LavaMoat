/* eslint-disable no-undef */
const test = require('ava')
const {
  createScenarioFromScaffold,
  runAndTestScenario,
} = require('lavamoat-core/test/util')
const { runScenario } = require('./util')

// here we are providing an endowments only to a module deep in a dep graph
test('globalWrites - two deps should be able to read each others globals', async (t) => {
  const scenario = createScenarioFromScaffold({
    name: 'globalWrites - two deps should be able to read each others globals',
    defineOne: () => {
      module.exports = require('two')
    },
    defineTwo: () => {
      xyz = true
      module.exports = require('three')
    },
    defineThree: () => {
      module.exports = xyz
    },
    config: {
      resources: {
        $root$: {
          packages: {
            two: true,
          },
        },
        two: {
          globals: {
            xyz: 'write',
          },
          packages: {
            three: true,
          },
        },
        three: {
          globals: {
            xyz: true,
          },
        },
      },
    },
    expectedResult: true,
  })
  await runAndTestScenario(t, scenario, runScenario)
})

// here we are providing an endowments only to a module deep in a dep graph
test('globalWrites - hiding globals from one module to another', async (t) => {
  const scenario = createScenarioFromScaffold({
    name: 'globalWrites - hiding globals from one module to another',
    defineOne: () => {
      module.exports = require('two')
    },
    defineTwo: () => {
      xyz = true
      module.exports = require('three')
    },
    defineThree: () => {
      module.exports = xyz
    },
    config: {
      resources: {
        $root$: {
          packages: {
            two: true,
          },
        },
        two: {
          globals: {
            xyz: 'write',
          },
          packages: {
            three: true,
          },
        },
        three: {
          globals: {
            xyz: false,
          },
        },
      },
    },
    expectedFailure: true,
    expectedFailureMessageRegex: /xyz is not defined/,
  })
  await runAndTestScenario(t, scenario, runScenario)
})
