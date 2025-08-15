/**
 * Provides {@link runCLI} for use in E2E tests
 *
 * @packageDocumentation
 */
import chalk from 'chalk'
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

export const execFileAsync = promisify(execFile)

/**
 * Path to the CLI entry point
 */

export const CLI_PATH = fileURLToPath(
  new URL('../../src/cli/cli.js', import.meta.url)
)

/**
 * @import {ExecFileException} from 'node:child_process'
 * @import {ExitCode, RunCLIOptions, RunCLIOutput} from '../types.js'
 * @import {ExecutionContext} from 'ava'
 */

/**
 * Run the `@lavamoat/node` CLI with the provided arguments
 *
 * @template [Context=unknown] Default is `unknown`
 * @overload
 * @param {string[]} args CLI arguments
 * @param {RunCLIOptions} [options] Options
 * @returns {Promise<RunCLIOutput>}
 */

/**
 * Run the `@lavamoat/node` CLI with the provided arguments
 *
 * @template [Context=unknown] Default is `unknown`
 * @overload
 * @param {string[]} args CLI arguments
 * @param {ExecutionContext<Context>} [t] AVA test context
 * @param {RunCLIOptions} [options] Options
 * @returns {Promise<RunCLIOutput>}
 */

/**
 * Run the `@lavamoat/node` CLI with the provided arguments
 *
 * @template [Context=unknown] Default is `unknown`
 * @param {string[]} args CLI arguments
 * @param {ExecutionContext<Context> | RunCLIOptions} [tOrOptions] AVA test
 *   context
 * @param {RunCLIOptions} [options] Options
 * @returns {Promise<RunCLIOutput>}
 */

export const runCLI = async (
  args,
  tOrOptions,
  { cwd = process.cwd() } = {}
) => {
  await Promise.resolve()

  /** @type {ExecutionContext<Context> | undefined} */
  let t
  if (tOrOptions) {
    if ('plan' in tOrOptions) {
      t = tOrOptions
    } else {
      cwd = tOrOptions?.cwd ?? cwd
    }
  }

  /** @type {string} */
  let stdout
  /** @type {string} */
  let stderr
  /**
   * It's the exit code!
   *
   * Read {@link ExitCode my blathering} about it
   *
   * @type {ExitCode}
   */
  let code

  /**
   * Generate the full command for logging (and snapshots!?)
   *
   * This value is saved in the snapshot `.md` file (it's in the assertion
   * failure message), so we should strip absolute paths since they will differ
   * between dev envrionments.
   *
   * - Since `cwd` could be anything depending on the dev environment and relative
   *   planetary positions, it doesn't belong in the snapshot; we only ouptut to
   *   the log.
   * - `/path/to/node ${CLI_PATH}` is replaced with `lavamoat` for logging
   *   purposes.
   * - Any flags provided directly to the _current_ process do not cascade to the
   *   child process
   * - We launch using `node` instead of using the path directly due to
   *   portability concerns.
   *
   * @type {string}
   */
  const hrCommand = chalk.whiteBright(`lavamoat ${args.join(' ')}`)

  t?.log(`Executing: ${hrCommand} in ${chalk.white(cwd)}`)

  try {
    ;({ stdout, stderr } = await execFileAsync(
      process.execPath,
      [CLI_PATH, ...args],
      {
        encoding: 'utf8',
        cwd,
      }
    ))
  } catch (err) {
    ;({ stdout, stderr, code } =
      /**
       * You'd think this type would be somewhere in `@types/node`, but it's
       * not. Why? There's no place in `Promise<T>` to define the rejection
       * type.
       *
       * @type {ExecFileException & {
       *   stdout: string
       *   stderr: string
       * }}
       */
      (err))
  }
  return { stdout, stderr, code, hrCommand }
}
