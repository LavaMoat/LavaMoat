const { default: test } = require('ava')
const { runScenario } = require('./util')
const { loadScenarios } = require('lavamoat-core/test/scenarios/index')
const {
  runAndTestScenario,
  createScenarioFromScaffold,
} = require('lavamoat-core/test/util')

test('Run scenarios', async (t) => {
  for await (const scenario of loadScenarios()) {
    if (!(
      Object.keys(scenario.context).length === 0 &&
      scenario.context.constructor === Object
    )) {
      continue
    }
    t.log(`Running Node Scenario: ${scenario.name}`)
    await runAndTestScenario(t, scenario, ({ scenario }) =>
      runScenario({ scenario })
    )
  }
})

test('Run lavamoat-node specific scenario for localStorage in Node 26', async (t) => {
  const scenarioScaffold = {
    name: 'endowments - localStorage getter is forwarded in node26',
    defineTwo: () => {
      // eslint-disable-next-line n/no-unsupported-features/node-builtins
      globalThis.localStorage
      module.exports = 'cleared'
    },
    config: {
      resources: {
        two: {
          globals: {
            localStorage: true,
          },
        },
      },
    },
  }

  const nodeVersion = process.versions.node
  // This test will likely require an update when localStorage behavior changes in future Node versions
  if (nodeVersion.startsWith('26')) {
    t.log(`running variant for experimental localStorage warning`)
    // note: the failure comes from the experimental localStorage warning being printed to stderr
    scenarioScaffold.expectedFailure = true
    scenarioScaffold.expectedFailureMessageRegex =
      /Unexpected output in standard err:\s*.*localStorage is not available/g
  } else {
    t.log(`running regular variant`)
    scenarioScaffold.expectedResult = 'cleared'
  }

  const scenario = createScenarioFromScaffold(scenarioScaffold)
  await runAndTestScenario(t, scenario, ({ scenario }) =>
    runScenario({ scenario })
  )
})
