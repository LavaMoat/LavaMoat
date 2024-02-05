// @ts-check

import test from 'ava'
import { loadScenarios } from './scenarios/index.js'
import Util from './util.js'

// TODO: figure out why TS does not like the named exports from util.js
const { runScenario, runAndTestScenario } = Util

for await (const scenario of loadScenarios()) {
  test.serial(`core scenario: ${scenario.name}`, async (t) => {
    // @ts-expect-error - scenario is untyped
    await runAndTestScenario(t, scenario, ({ scenario }) =>
      runScenario({ scenario })
    )
  })
  test.serial(
    `core scenario (precompiled initializer): ${scenario.name}`,
    async (t) => {
      // @ts-expect-error - scenario is untyped
      await runAndTestScenario(t, scenario, ({ scenario }) =>
        runScenario({ scenario, runWithPrecompiledModules: true })
      )
    }
  )
}
