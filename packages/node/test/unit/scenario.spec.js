import '../../src/preamble.js'

/* eslint-disable ava/no-skip-test */
import test from 'ava'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore probably broken
import { loadScenarios } from 'lavamoat-core/test/scenarios/index.js'
// @ts-expect-error - needs types
import { runAndTestScenario } from 'lavamoat-core/test/util.js'
import { createScenarioRunner } from './scenario-util.js'

/**
 * Macro to test a scenario
 */
const testScenario = test.macro(
  /**
   * @param {import('ava').ExecutionContext} t
   * @param {any} scenario
   */
  async (t, scenario) => {
    await runAndTestScenario(t, scenario, createScenarioRunner(t.log.bind(t)))
  }
)

// TIL: you can dynamically create tests in an async iterator
// as long as you use `test.serial()`
for await (const scenario of loadScenarios()) {
  if (
    !(
      scenario.context &&
      Object.keys(scenario.context).length === 0 &&
      scenario.context.constructor === Object
    )
  ) {
    // these will never work. I don't know what they are, though.
    test.skip(
      `${scenario.name} - incompatible platform`,
      testScenario,
      scenario
    )
    continue
  }

  // TODO implement scuttling
  if (scenario.name?.startsWith('scuttle')) {
    test.todo(`${scenario.name} - scuttling unsupported`)
    continue
  }

  test(scenario.name ?? '(unknown scenario)', testScenario, scenario)
}
