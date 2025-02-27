/**
 * Provides {@link runCLI} for use in E2E tests
 *
 * @packageDocumentation
 */

import { execFile } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
export const execFileAsync = promisify(execFile)

/**
 * Path to the CLI entry point
 */

export const CLI_PATH = fileURLToPath(
  new URL('../../src/cli.js', import.meta.url)
)

/**
 * @import {ExecFileException} from 'node:child_process'
 * @import {RunCLIOutput} from '../types.js'
 * @import {ExecutionContext} from 'ava'
 */

/**
 * Run the `@lavamoat/node` CLI with the provided arguments
 *
 * @template [Context=unknown] Default is `unknown`
 * @param {string[]} args CLI arguments
 * @param {ExecutionContext<Context>} [t] AVA test context
 * @returns {Promise<RunCLIOutput>}
 */

export const runCLI = async (args, t) => {
  await Promise.resolve()

  /** @type {string} */
  let stdout
  /** @type {string} */
  let stderr
  /** @type {ExecFileException['code']} */
  let code

  /**
   * Full command; for display purposes only.
   *
   * This value is saved in the snapshot `.md` file (it's in the assertion
   * failure message), so we should strip absolute paths since they will differ
   * between dev envrionments.
   */
  const hrCommand = `node ${path.relative(fileURLToPath(import.meta.url), CLI_PATH)} ${args.join(' ')}`

  t?.log(`executing: ${hrCommand}`)

  try {
    ;({ stdout, stderr } = await execFileAsync(
      process.execPath,
      [CLI_PATH, ...args],
      { encoding: 'utf8' }
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
