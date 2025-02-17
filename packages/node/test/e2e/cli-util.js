/**
 * Provides {@link runCli} for use in E2E tests
 *
 * @packageDocumentation
 */

import { execFile } from 'node:child_process'
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
 * @import {RunCliOutput} from '../types.js'
 */

/**
 * Run the `@lavamoat/node` CLI with the provided arguments
 *
 * @param {string[]} args CLI arguments
 * @returns {Promise<RunCliOutput>}
 */

export const runCli = async (args) => {
  await Promise.resolve()

  /** @type {string} */
  let stdout
  /** @type {string} */
  let stderr
  /** @type {ExecFileException['code']} */
  let code

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
  return { stdout, stderr, code }
}
