// @ts-check
const { default: test } = require('ava')
const { loadScenarios, loadCoreScenarios } = require('./scenarios.cjs')
const { runScenario, runAndTestScenario } = require('./util.cjs')

/**
 * @import { Scenario } from './scenario'
 */

/**
 * AVA macro that runs a scenario and checks the outcome.
 *
 * @type {import('ava').Macro<[Scenario]>}
 */
const runMacro = test.macro(
  /**
   * @param {import('ava').ExecutionContext} t
   * @param {Scenario} scenario
   */
  async (t, scenario) => {
    await runAndTestScenario(t, scenario, runScenario)
  }
)

;(async () => {
  for await (const scenario of loadScenarios()) {
    test(`core scenario: ${scenario.name}`, runMacro, scenario)
  }
})()

;(async () => {
  for await (const scenario of loadCoreScenarios()) {
    test(`core scenario: ${scenario.name}`, runMacro, scenario)
  }
})()
