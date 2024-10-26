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
 * @import {ExecLavamoatNodeExpectation} from './fixture-util.js'
 */

import { run } from '../src/run.js'
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
    title: (title) => `execution - ${title ?? 'output matches expected'}`,
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
    title: (title) => `cli - ${title ?? 'output matches expected'}`,
    exec: async (t, args, expected) => {
      await Promise.resolve()

      t.log(`executing: ${process.execPath} ${CLI_PATH} ${args.join(' ')}`)

      const { stdout, stderr, code } = await runCli(args)

      const trimmedStdout = stdout.trim().replace(ANSI_REGEX, '')
      const trimmedStderr = stderr.trim().replace(ANSI_REGEX, '')

      switch (typeof expected) {
        case 'string':
          t.is(trimmedStdout, expected, 'stdout does not match expected value')
          break
        case 'function':
          await expected(t, {
            stdout: trimmedStdout,
            stderr: trimmedStderr,
            code,
          })
          break
        case 'object':
          if ('stdout' in expected) {
            t.is(
              trimmedStdout,
              expected.stdout,
              'stdout does not match expected value'
            )
          }
          if ('stderr' in expected) {
            t.is(
              trimmedStderr,
              expected.stderr,
              'stderr does not match expected value'
            )
          }
          if ('code' in expected) {
            t.is(code, expected.code, 'exit code does not match expected value')
          }
          break
        default:
          t.snapshot(
            { trimmedStderr, trimmedStdout, code },
            'execution output does not match expected snapshot'
          )
      }
    },
  }

  return { testExec: test.macro(testExec), testCLI: test.macro(testCLI) }
}
