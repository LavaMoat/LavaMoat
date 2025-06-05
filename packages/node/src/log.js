/**
 * Provides a {@link log nice logger}.
 *
 * @packageDocumentation
 */

import { createConsola, LogLevels } from 'consola'

/**
 * @import {ConsolaInstance} from 'consola'
 */

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
 *
 * @type {ConsolaInstance}
 */
export const log = createConsola({
  level: process.env.LAVAMOAT_DEBUG ? LogLevels.debug : LogLevels.info,
  fancy: true,
  formatOptions: {
    timestamp: false,
    date: false,
  },
})

export { LogLevels }
