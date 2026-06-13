import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { Worker } from 'node:worker_threads'
import { toPath } from '../../../src/util.js'

/**
 * @import {TestFn, MacroDeclarationOptions, ExecutionContext} from 'ava'
 * @import {LavaMoatPolicy} from '@lavamoat/types'
 * @import {ExecRunnerMessage, TestExecForJSONMacroOptions, TestExecMacroOptions} from '../../types.js'
 */

/**
 * Path to `./exec-runner.js`
 */
const RUNNER_MODULE_PATH = (
  process.env.WALLABY_PROJECT_DIR
    ? pathToFileURL(
        path.join(
          process.env.WALLABY_PROJECT_DIR,
          'packages',
          'node',
          'test',
          'unit',
          'exec',
          'exec-runner.js'
        )
      )
    : new URL('./exec-runner.js', import.meta.url)
).pathname

/**
 * @satisfies {LavaMoatPolicy}
 */
const DEFAULT_POLICY = Object.freeze({
  resources: {},
})

/**
 * Waits for the exec runner worker to post its result message.
 *
 * The worker posts `{type: 'success', result}` or `{type: 'error', message}`.
 * This function resolves with the result on success, and rejects with an
 * `Error` reconstituted from the worker's error message on failure.
 *
 * @param {Worker} worker
 * @returns {Promise<unknown>}
 */
const receiveResult = async (worker) => {
  const result = await new Promise((resolve, reject) => {
    worker
      .once(
        'message',
        /** @param {ExecRunnerMessage} msg */ (msg) => {
          if (msg.type === 'success') {
            resolve(msg.result)
          } else {
            reject(msg.error)
          }
        }
      )
      .once('error', reject)
  })
  try {
    await worker.terminate()
  } finally {
    worker.removeAllListeners()
  }
  return result
}

/**
 * Executes the given code in the worker and asserts the result matches the
 * expected value.
 *
 * @param {Worker} worker
 * @param {ExecutionContext<unknown>} t
 * @param {unknown} expected
 */
const execInWorker = async (worker, t, expected) => {
  worker.unref()
  worker.stdout.resume()
  worker.stderr.resume()
  const result = await receiveResult(worker)
  t.deepEqual({ .../** @type {any} */ (result) }, expected)
}

/**
 * Given an AVA test function, returns a set of macros for testing policy
 * generation using various types of fixtures.
 *
 * @remarks
 * People seem to dig being able to define sources inline, so here are some
 * macros to do it.
 * @template [Ctx=unknown] Custom execution context, if any. Default is
 *   `unknown`
 * @param {TestFn<Ctx>} test - AVA test function
 * @internal
 */
export const createExecMacros = (test) => {
  /**
   * Unique index for generic test titles (to avoid test title collisions)
   */
  let genericTitleIndex = 0

  const testExecForJSON = test.macro(
    /**
     * @type {MacroDeclarationOptions<
     *   [
     *     fixtureFilename: string,
     *     expected: unknown,
     *     options?: TestExecForJSONMacroOptions,
     *   ]
     * >}
     */ ({
      exec: async (
        t,
        fixtureFilename,
        expected,
        { policy = DEFAULT_POLICY, jsonEntrypoint } = {}
      ) => {
        const worker = new Worker(RUNNER_MODULE_PATH, {
          stdout: true,
          stderr: true,
          workerData: {
            isJsonFixture: true,
            fixtureFilename,
            jsonEntrypoint: jsonEntrypoint ? toPath(jsonEntrypoint) : undefined,
            policy,
          },
        })
        await execInWorker(worker, t, expected)
      },
      title: (title) =>
        title ?? `program output matches expected (${genericTitleIndex++}`,
    })
  )

  const testExec = test.macro(
    /**
     * @type {MacroDeclarationOptions<
     *   [
     *     entrypoint: string | URL,
     *     expected: unknown,
     *     options?: TestExecMacroOptions,
     *   ]
     * >}
     */ ({
      exec: async (
        t,
        entrypoint,
        expected,
        { policy = DEFAULT_POLICY } = {}
      ) => {
        const worker = new Worker(RUNNER_MODULE_PATH, {
          stdout: true,
          stderr: true,
          workerData: {
            isJsonFixture: false,
            entryPath: toPath(entrypoint),
            policy,
          },
        })
        await execInWorker(worker, t, expected)
      },
      title: (title) =>
        title ?? `program output matches expected (${genericTitleIndex++}`,
    })
  )

  return {
    testExecForJSON,
    testExec,
  }
}
