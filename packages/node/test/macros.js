/**
 * Macros for testing execution of applications using `@lavamoat/node`
 *
 * See {@link createMacros}
 *
 * @packageDocumentation
 */

/**
 * @import {TestFn, MacroDeclarationOptions} from 'ava'
 * @import {LavaMoatPolicy} from 'lavamoat-core'
 * @import {ExecLavamoatNodeExpectation} from './types.js'
 */

import { run } from '../src/run.js'
import { isString } from '../src/util.js'
import { CLI_PATH, runCli } from './fixture-util.js'

/**
 * RegExp to match ANSI escape codes
 *
 * @see {@link https://github.com/chalk/ansi-regex}
 */
const ANSI_REGEX = new RegExp(
  // eslint-disable-next-line no-control-regex
  '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)|(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))',
  'g'
)

const { values } = Object

/**
 * Unique index for generic test titles (to avoid test title collisions)
 */
let genericTitleIndex = 0

/**
 * Given an AVA test function, returns a set of macros for testing program
 * execution
 *
 * @template [Ctx=unknown] Custom execution context, if any. Default is
 *   `unknown`
 * @param {TestFn<Ctx>} test - AVA test function
 */
export function createMacros(test) {
  /**
   * Macro to invoke the `run()` function (as exported from `@lavamoat/node`)
   * directly against an entry point and merged policy (_not_ policy path).
   *
   * @type {MacroDeclarationOptions<
   *   [entry: string | URL, policy: LavaMoatPolicy, expected: unknown],
   *   Ctx
   * >}
   */
  const testExec = {
    exec: async (t, entryFile, policy, expected) => {
      const result = await run(entryFile, policy)
      t.deepEqual({ .../** @type {any} */ (result) }, expected)
    },
    title: (title) =>
      title ?? `program output matches expected (${genericTitleIndex++}`,
  }

  /**
   * Macro to run the `@lavamoat/node` CLI with the provided arguments, and
   * optionally perform assertions on the output.
   *
   * If no assertions are provided, the output is snapshotted.
   *
   * @type {MacroDeclarationOptions<
   *   [args: string[], expected?: ExecLavamoatNodeExpectation],
   *   Ctx
   * >}
   */
  const testCLI = {
    title: (title) =>
      title ?? `program output matches expected (${genericTitleIndex++}`,
    exec: async (t, args, expected) => {
      /**
       * For display purposes
       */
      const command = `${process.execPath} ${CLI_PATH} ${args.join(' ')}`
      t.log(`executing: ${command}`)

      const { stdout, stderr, code } = await runCli(args)

      const trimmedStdout = stdout.trim().replace(ANSI_REGEX, '')
      const trimmedStderr = stderr.trim().replace(ANSI_REGEX, '')

      switch (typeof expected) {
        case 'string':
          t.plan(1)
          t.is(
            trimmedStdout,
            expected,
            `STDOUT of command "${command}" does not match expected value`
          )
          break
        case 'function':
          // the caller provided a function to perform custom assertions
          await expected(t, {
            stdout: trimmedStdout,
            stderr: trimmedStderr,
            code,
          })
          break
        case 'object': {
          // the caller provided an object with expected values for optionally each prop of the output of `runCli`

          /**
           * We're doing all this extra work here because we have a variable
           * number of assertions to make. AVA recommends using {@link t.plan} in
           * this case. We need to determine what we're going to do _up front_,
           * call `t.plan()`, then make the assertion(s).
           *
           * The props of this type correspond to props in the object fulfilled
           * by the {@link runCli} function. The values are a tuple of parameters
           * for {@link t.is}.
           *
           * @remarks
           * This would likely be better expressed with a generic type, but this
           * type is _local_ to this function--and I don't want it escaping.
           * @type {{
           *   stdout?: [actual: string, expected: string, message: string]
           *   stderr?: [actual: string, expected: string, message: string]
           *   code?: [
           *     actual: string | number | null | undefined,
           *     expected: string | number | null | undefined,
           *     message: string,
           *   ]
           * }}
           */
          const assertionPlans = {}

          if ('stdout' in expected && isString(expected.stdout)) {
            assertionPlans.stdout = [
              trimmedStdout,
              expected.stdout,
              `STDOUT of command "${command}" does not match expected value`,
            ]
          }
          if ('stderr' in expected && isString(expected.stderr)) {
            assertionPlans.stderr = [
              trimmedStderr,
              expected.stderr,
              `STDERR of command "${command}" does not match expected value`,
            ]
          }
          if ('code' in expected) {
            assertionPlans.code = [
              code,
              expected.code,
              `exit code of command "${command}" does not match expected value`,
            ]
          }

          const assertionArgs = values(assertionPlans)

          // This is what we were trying to get
          const plan = assertionArgs.filter(Boolean).length
          t.plan(plan)

          // note: typescript will complain if you attempt to spread over a
          // union type (even if it's a union of tuples)--which is what
          // `assertionArgs` is.
          for (const [actual, expected, message] of assertionArgs) {
            t.is(actual, expected, message)
          }

          break
        }
        default:
          t.plan(1)
          t.snapshot(
            { trimmedStderr, trimmedStdout, code },
            `output of command "${command}" does not match expected snapshot`
          )
      }
    },
  }

  return { testExec: test.macro(testExec), testCLI: test.macro(testCLI) }
}
