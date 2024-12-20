import '../../src/preamble.js'

import test from 'ava'
import fs from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DEFAULT_POLICY_FILENAME } from '../../src/constants.js'
import { isPolicy, readPolicy } from '../../src/policy.js'
import { isString, readJsonFile } from '../../src/util.js'
import { CLI_PATH, runCli } from './cli-util.js'

/**
 * @import {PackageJson} from 'type-fest'
 * @import {MacroDeclarationOptions} from 'ava'
 * @import {ExecLavamoatNodeExpectation} from '../types.js'
 */

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
            // eslint-disable-next-line ava/assertion-arguments
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
  })
)

/**
 * Path to the "basic" fixture entry point
 */
const BASIC_ENTRYPOINT = fileURLToPath(
  new URL('./fixture/basic/app.js', import.meta.url)
)

/**
 * The "basic" fixture's directory
 */
const BASIC_ENTRYPOINT_CWD = path.dirname(BASIC_ENTRYPOINT)

test('"--help" prints help', testCLI, ['--help'])

test(
  '"--version" matches package descriptor',
  testCLI,
  ['--version'],
  async (t, { stdout }) => {
    const { version } = /** @type {PackageJson} */ (
      await readJsonFile(new URL('../../package.json', import.meta.url))
    )
    t.is(stdout, `${version}`)
  }
)

test('run - "run --help" prints help', testCLI, ['run', '--help'])

test(
  'run - missing entrypoint',
  testCLI,
  ['run'],
  async (t, { code, stderr, stdout }) => {
    t.plan(3)
    t.is(code, 1)
    t.is(stdout, '')
    t.regex(stderr, /Not enough non-option arguments: got 0, need at least 1/)
  }
)

test(
  'run - basic execution',
  testCLI,
  ['run', BASIC_ENTRYPOINT, '--cwd', BASIC_ENTRYPOINT_CWD],
  'hello world'
)

test('generate - "generate --help" prints help', testCLI, [
  'generate',
  '--help',
])

test('generate - basic policy generation', async (t) => {
  const tempdir = await fs.mkdtemp(
    path.join(tmpdir(), 'lavamoat-node-cli-test-')
  )

  const policyPath = path.join(tempdir, DEFAULT_POLICY_FILENAME)

  try {
    await runCli(['generate', BASIC_ENTRYPOINT, '--policy', policyPath])
    const policy = await readPolicy(policyPath)
    t.true(isPolicy(policy))
    // t.deepEqual(policy, { resources: {} })
  } finally {
    await fs.rm(tempdir, { recursive: true, force: true })
  }
})
