/**
 * Provides a {@link log nice logger}.
 *
 * @packageDocumentation
 */

import { Loggerr } from 'loggerr'
import { createFormatter } from './log-formatter.js'
import { noop } from './util.js'

/**
 * @import {
 *   DefaultLevels,
 *   LoggerrOptions
 * } from 'loggerr'
 */

/**
 * Factory function to create a new logger.
 *
 * @param {LoggerrOptions<DefaultLevels>} [options]
 * @returns {Loggerr<DefaultLevels>}
 */
export const createLogger = (options) => {
  const log = new Loggerr({
    formatter: createFormatter(),
    streams: [
      process.stderr,
      process.stderr,
      process.stderr,
      process.stderr,
      process.stderr,
      process.stderr,
      process.stderr,
      process.stderr,
    ],
    level: process.env.LAVAMOAT_DEBUG ? Loggerr.DEBUG : Loggerr.INFO,
    ...options,
  })

  return log
}

/**
 * This is a logger object.
 *
 * The `streams` is used to overwrite the stream used for each log level with
 * {@link process.stderr}.
 *
 * {@link Loggerr `loggerr`'s} default behavior is to use `stdout` for `notice`,
 * `debug` and `info` levels. Output originating in `@lavamoat/node` is
 * generally warnings or information about the policy generation and conversion
 * process. The "output" of `@lavamoat/node` should be considered the output of
 * the program being executed; thus `@lavamoat/node` should not use `stdout` for
 * its own output.
 *
 * Because the value is handled as a tuple, we cannot generate it via
 * {@link Array.fill}
 */
export const log = createLogger()

export { Loggerr }

/**
 * Disables warnings for a logger.
 *
 * Mutates the {@link Loggerr} instance in place.
 *
 * @param {Loggerr<DefaultLevels>} log
 * @returns {void}
 */
export const disableWarnings = (log) => {
  log.warning = noop
}
