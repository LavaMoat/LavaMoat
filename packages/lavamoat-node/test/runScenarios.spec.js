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

test('Run lavamoat-node specific scenario', async (t) => {
  const scenarioCreator = async () => {
    const nodeVersion = process.versions.node
    // This test will likely require an update when localStorage behavior changes in future Node versions
    const messageExpectation = nodeVersion.startsWith('26')
      ? /localStorage is not available/
      : /Cannot read properties of undefined/
    const scenario = createScenarioFromScaffold({
      name: 'endowments - localStorage getter is forwarded in node26',
      defineOne: () => {
        // eslint-disable-next-line n/no-unsupported-features/node-builtins
        localStorage.clear()
      },
      config: {
        resources: {
          one: {
            globals: {
              localStorage: true,
            },
          },
        },
      },
      expectedFailure: true,
      expectedFailureMessageRegex: messageExpectation,
    })
    return scenario
  }
  const scenario = await scenarioCreator()
  t.log(`Running Node Scenario: ${scenario.name}`)
  await runAndTestScenario(t, scenario, ({ scenario }) =>
    runScenario({ scenario })
  )
})
