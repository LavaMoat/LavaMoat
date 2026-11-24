// @ts-check
/**
 * Test utilities for `@lavamoat/core`.
 *
 * @module
 */

'use strict'

const path = require('node:path')
const { runInContext, createContext } = require('node:vm')
const { Worker } = require('node:worker_threads')
const { once } = require('node:events')

/**
 * @import {LavaMoatPolicy} from '@lavamoat/types'
 * @import {ExecutionContext} from 'ava'
 * @import {
 *   PlatformRunScenario,
 *   RunnerWorkerData,
 *   Scenario,
 *   ScenarioExpect
 * } from './scenario'
 */

const WORKER_PATH = path.join(
  __dirname,
  'scenario-runtime',
  'worker.cjs'
)

/**
 * Run a scenario fixture in an isolated Worker thread.
 *
 * Implements the {@link PlatformRunScenario} contract for the core package's
 * own test suite.
 *
 * @template [Result=unknown] Default is `unknown`
 * @type {PlatformRunScenario<Result>}
 */
async function runScenario({ scenario }) {
  const sc = /** @type {Scenario} */ (scenario)

  /** @type {RunnerWorkerData} */
  const workerData = {
    entryPath: sc.entryPath,
    policy: sc.policy,
    setupPath: sc.setupPath,
    scuttleGlobalThis: sc.scuttleGlobalThis,
    globalThisRefs: sc.globalThisRefs,
  }

  const worker = new Worker(WORKER_PATH, {
    stdout: true,
    stderr: true,
    workerData,
  })

  /** @type {string} */
  let stdout = ''
  /** @type {string} */
  let stderr = ''

  worker.stdout.on('data', (chunk) => {
    stdout += chunk
  })
  worker.stderr.on('data', (chunk) => {
    stderr += chunk
  })

  const [exitCode] = await once(worker, 'exit')

  if (exitCode !== 0) {
    const msg = stderr.trim()
    throw new Error(msg || `Worker exited with code ${exitCode}`)
  }

  try {
    return /** @type {Result} */ (JSON.parse(stdout.trim()))
  } catch {
    throw new Error(`Unexpected non-JSON output from worker:\n${stdout}`)
  }
}

/**
 * Run a scenario via `platformRunScenario` and assert the outcome against
 * `scenario.expect`.
 *
 * @template [Result=unknown] Default is `unknown`
 * @param {ExecutionContext} t
 * @param {Scenario} scenario
 * @param {PlatformRunScenario<Result>} platformRunScenario
 * @returns {Promise<Result | undefined>}
 */
async function runAndTestScenario(t, scenario, platformRunScenario) {
  /** @type {Result | undefined} */
  let result
  /** @type {Error | undefined} */
  let err

  try {
    result = await platformRunScenario({ scenario })
  } catch (e) {
    err = /** @type {Error} */ (e)
  }

  const expect_ = scenario.expect

  if ('error' in expect_) {
    if (err) {
      t.truthy(err, `scenario "${scenario.name}" fails as expected`)
      t.regex(
        err.message,
        new RegExp(expect_.error),
        `error message matches expected pattern`
      )
    } else {
      t.fail(
        `Expected an error matching /${expect_.error}/ but scenario succeeded with: ${JSON.stringify(result)}`
      )
    }
  } else if ('truthy' in expect_) {
    if (err) {
      t.fail(`Unexpected error in scenario "${scenario.name}": ${err.message}`)
    } else {
      t.truthy(result, `${scenario.name} - result is truthy`)
    }
  } else if ('falsy' in expect_) {
    if (err) {
      t.fail(`Unexpected error in scenario "${scenario.name}": ${err.message}`)
    } else {
      t.falsy(result, `${scenario.name} - result is falsy`)
    }
  } else {
    // deepEqual
    if (err) {
      t.fail(`Unexpected error in scenario "${scenario.name}": ${err.message}`)
    } else {
      t.deepEqual(
        result,
        expect_.result,
        `${scenario.name} - result matches expected`
      )
    }
  }

  return result
}

/**
 * Create a fresh `globalThis` from a new vm context.
 *
 * Used by `scuttle.spec.ts` which tests the `scuttle` function directly.
 *
 * @returns {Record<string, unknown>}
 */
function getFreshGlobalThis() {
  const vmContext = createContext()
  const vmGlobalThis = runInContext('globalThis', vmContext)
  /** @type {Record<string, unknown>} */
  const newGlobal = {}
  Object.defineProperties(
    newGlobal,
    Object.getOwnPropertyDescriptors(vmGlobalThis)
  )
  return newGlobal
}

module.exports = {
  runScenario,
  runAndTestScenario,
  getFreshGlobalThis,
}
