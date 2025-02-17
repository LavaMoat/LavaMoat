/**
 * @import {MacroDeclarationOptions, TestFn} from 'ava'
 * @import {ExecLavamoatNodeExpectation} from '../types.js'
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripVTControlCharacters } from 'node:util'
import { CLI_PATH, runCli } from './cli-util.js'

const { values } = Object

/**
 * Unique index for generic test titles (to avoid test title collisions)
 */
let genericTitleIndex = 0

/**
 * Creates macro(s) for running E2E tests against the `lavamoat` CLI
 *
 * @template [Ctx=unknown] Custom execution context, if any. Default is
 *   `unknown`
 * @param {TestFn<Ctx>} test
 */
export const createCLIMacros = (test) => {
  /**
   * Macro to run the `@lavamoat/node` CLI with the provided arguments, and
   * optionally perform assertions on the output.
   *
   * If no assertions are provided, the output is snapshotted.
   */
  const testCLI = test.macro(
    /**
     * @type {MacroDeclarationOptions<
     *   [args: string[], expected?: ExecLavamoatNodeExpectation]
     * >}
     */ ({
      title: (title) =>
        title ?? `program output matches expected (${genericTitleIndex++}`,
      exec: async (t, args, expected) => {
        /**
         * Full command; for display purposes only.
         *
         * This value is saved in the snapshot `.md` file (it's in the assertion
         * failure message), so we should strip absolute paths since they will
         * differ between dev envrionments.
         */
        const command = `node ${path.relative(fileURLToPath(import.meta.url), CLI_PATH)} ${args.join(' ')}`
        t.log(`executing: ${command}`)

        const { stdout, stderr, code } = await runCli(args)

        const trimmedStdout = stripVTControlCharacters(stdout.trim())
        const trimmedStderr = stripVTControlCharacters(stderr.trim())

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
             * number of assertions to make. AVA recommends using {@link t.plan}
             * in this case. We need to determine what we're going to do _up
             * front_, call `t.plan()`, then make the assertion(s).
             *
             * The props of this type correspond to props in the object
             * fulfilled by the {@link runCli} function. The values are a tuple
             * of parameters for {@link t.is}.
             *
             * @remarks
             * This would likely be better expressed with a generic type, but
             * this type is _local_ to this function--and I don't want it
             * escaping.
             * @type {{
             *   stdout?: [
             *     actual: string,
             *     expected: string | RegExp,
             *     message: string,
             *   ]
             *   stderr?: [
             *     actual: string,
             *     expected: string | RegExp,
             *     message: string,
             *   ]
             *   code?: [
             *     actual: string | number | null | undefined,
             *     expected: string | number | null | undefined,
             *     message: string,
             *   ]
             * }}
             */
            const assertionPlans = {}

            if (expected.stdout) {
              assertionPlans.stdout = [
                trimmedStdout,
                expected.stdout,
                `STDOUT of command "${command}" does not match expected value`,
              ]
            }
            if (expected.stderr) {
              assertionPlans.stderr = [
                trimmedStderr,
                expected.stderr,
                `STDERR of command "${command}" does not match expected value`,
              ]
            }
            if (expected.code) {
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

            for (const [actual, expected, message] of assertionArgs) {
              if (expected instanceof RegExp) {
                t.regex(`${actual}`, expected, message)
              } else {
                t.is(actual, expected, message)
              }
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
    })
  )

  return { testCLI }
}
