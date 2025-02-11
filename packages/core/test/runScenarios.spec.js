const test = require('ava')
const { loadScenarios } = require('./scenarios')
const { runScenario, runAndTestScenario } = require('./util')

;(async () => {
  for await (const scenario of loadScenarios()) {
    test.serial(`core scenario: ${scenario.name}`, async (t) => {
      await runAndTestScenario(t, scenario, ({ scenario }) =>
        runScenario({ scenario })
      )
    })

    test.serial(
      `core scenario (precompiled initializer): ${scenario.name}`,
      async (t) => {
        await runAndTestScenario(t, scenario, ({ scenario }) =>
          runScenario({ scenario, runWithPrecompiledModules: true })
        )
      }
    )
  }
})()
