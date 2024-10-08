/* eslint-disable ava/no-skip-test */
import test from 'ava'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore probably broken
import { loadScenarios } from 'lavamoat-core/test/scenarios/index.js'
// @ts-expect-error - needs types
import { runAndTestScenario } from 'lavamoat-core/test/util.js'
import { createScenarioRunner } from './scenario-util.js'

const GLOBAL_WRITE_REGEX = /".+?":"write"/g

/**
 * If the policy file contains a writable global we have to skip it until we've
 * implemented it
 *
 * @param {any} scenario
 * @returns
 * @todo Implement & remove
 */
function policyHasWritableGlobal(scenario) {
  return (
    GLOBAL_WRITE_REGEX.test(JSON.stringify(scenario.config)) ||
    GLOBAL_WRITE_REGEX.test(JSON.stringify(scenario.configOverride))
  )
}

const FAILING_SCENARIOS = new Set([
  'globalRef - check default containment',
  'globalRef - Webpack code in the wild works',
])

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

  // TODO fix
  if (scenario.name && FAILING_SCENARIOS.has(scenario.name)) {
    test.failing(`${scenario.name} - `, testScenario, scenario)
    continue
  }

  // TODO implement writable globals
  if (policyHasWritableGlobal(scenario)) {
    test.todo(`${scenario.name} - has writable global`)
    continue
  }

  // TODO implement scuttling
  if (scenario.name?.startsWith('scuttle')) {
    test.todo(`${scenario.name} - scuttling unsupported`)
    continue
  }

  test.serial(scenario.name ?? '(unknown scenario)', testScenario, scenario)
}
