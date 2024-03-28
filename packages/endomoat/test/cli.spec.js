import test from 'ava'
import { execFile } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { readJsonFile } from '../src/util.js'

const execFileAsync = promisify(execFile)

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
 * Path to the CLI entry point
 */
const CLI_PATH = fileURLToPath(new URL('../src/cli.js', import.meta.url))

const BASIC_ENTRYPOINT = fileURLToPath(
  new URL('./fixture/basic/app.js', import.meta.url)
)
const BASIC_ENTRYPOINT_CWD = path.dirname(BASIC_ENTRYPOINT)

/**
 * @typedef {import('node:child_process').ExecFileException['code']} ExitCode
 */

/**
 * Possible types for the `expected` argument of the {@link testCLI} macro.
 *
 * Execution output will be automatically trimmed and stripped of ANSI escape
 * codes (colors).
 *
 * If a `string`, it is compared to `stdout`.
 *
 * @template [Ctx=unknown] Default is `unknown`
 * @typedef {string
 *   | { code: ExitCode }
 *   | {
 *       stdout: string
 *       code?: ExitCode
 *     }
 *   | {
 *       stderr: string
 *       code?: ExitCode
 *     }
 *   | {
 *       stdout: string
 *       stderr: string
 *       code?: ExitCode
 *     }
 *   | ((
 *       t: import('ava').ExecutionContext<Ctx>,
 *       result: {
 *         stdout: string
 *         stderr: string
 *         code?: ExitCode
 *       }
 *     ) => void | Promise<void>)} ExecEndomoatExpectation
 */

/**
 * Run the `endomoat` CLI with the provided arguments
 *
 * @param {string[]} args CLI arguments
 * @returns {Promise<{ stdout: string; stderr: string; code: ExitCode }>}
 */
async function runCli(args) {
  await Promise.resolve()

  /** @type {string} */
  let stdout
  /** @type {string} */
  let stderr
  /** @type {import('node:child_process').ExecFileException['code']} */
  let code

  try {
    ;({ stdout, stderr } = await execFileAsync(
      process.execPath,
      [CLI_PATH, ...args],
      { encoding: 'utf8' }
    ))
  } catch (err) {
    ;({ stdout, stderr, code } = /**
     * @type {import('node:child_process').ExecFileException & {
     *   stdout: string
     *   stderr: string
     * }}
     */ (err))
  }
  return { stdout, stderr, code }
}

/**
 * Macro to run the `endomoat` CLI with the provided arguments, and optionally
 * perform assertions on the output.
 *
 * @todo Could create a factory function so it could be generic for any CLI
 */
const testCLI = test.macro(
  /**
   * @template [Ctx=unknown] Default is `unknown`
   * @param {import('ava').ExecutionContext<Ctx>} t Exec context
   * @param {string[]} args CLI arguments
   * @param {ExecEndomoatExpectation<Ctx>} [expected] Expected output or
   *   callback
   * @returns {Promise<void>}
   */
  async (t, args, expected) => {
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
  }
)

test('--help prints help', testCLI, ['--help'])

test('--version', testCLI, ['--version'], async (t, { stdout }) => {
  const { version } = /** @type {import('type-fest').PackageJson} */ (
    await readJsonFile(new URL('../package.json', import.meta.url))
  )
  t.is(stdout, `${version}`)
})

test('run - --help prints help', testCLI, ['run', '--help'])

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
