import '../../src/preamble.js'

import test from 'ava'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore probably broken
import { loadScenarios } from 'lavamoat-core/test/scenarios/index.js'
// @ts-expect-error - needs types
import { runAndTestScenario } from 'lavamoat-core/test/util.js'
import { createScenarioRunner, FAILING_SCENARIO_TAG } from './scenario-util.js'

/**
 * @import {ExecutionContext} from 'ava'
 * @import {LavaMoatNodeScenario} from '../types.js'
 */

/**
 * Macro to test a scenario
 */
const testScenario = test.macro(
  /**
   * @param {ExecutionContext} t
   * @param {LavaMoatNodeScenario} scenario
   */
  async (t, scenario) => {
    await runAndTestScenario(t, scenario, createScenarioRunner(t.log.bind(t)))
  }
)

/**
 * A set of scenario names which are exceptions to the logic in
 * {@link shouldFail}
 */
const EXPECTED_SUCCESSFUL_SCENARIOS = new Set([
  'scuttle - host env global object is too scuttled to work',
])

/**
 * Whether the scenario should fail
 *
 * @remarks
 * The conditional logic here is historical, copied from legacy `lavamoat`.
 * @param {LavaMoatNodeScenario} scenario
 * @returns {boolean}
 */
const shouldFail = (scenario) =>
  !(
    scenario.context &&
    Object.keys(scenario.context).length === 0 &&
    scenario.context.constructor === Object
  ) && !EXPECTED_SUCCESSFUL_SCENARIOS.has(`${scenario.name}`)

for await (const scenario of loadScenarios()) {
  /** @type {LavaMoatNodeScenario} */
  const nodeScenario = { ...scenario }
  if (shouldFail(nodeScenario)) {
    nodeScenario.expectedLavaMoatNodeFailure = true
    test.failing(
      `${nodeScenario.name} ${FAILING_SCENARIO_TAG}`,
      testScenario,
      nodeScenario
    )
    continue
  }

  test(nodeScenario.name ?? '(unknown scenario)', testScenario, nodeScenario)
}
