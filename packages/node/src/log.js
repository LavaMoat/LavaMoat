/**
 * Provides a {@link log nice logger}.
 *
 * @packageDocumentation
 */

import { Loggerr } from 'loggerr'

/**
 * This array is used to overwrite the stream used for each log level with
 * {@link process.stderr}.
 *
 * {@link Loggerr `loggerr`'s} default behavior is to use `stdout` for `notice`,
 * `debug` and `info` levels. Output originating in `@lavamoat/node` is
 * generally warnings or information about the policy generation and conversion
 * process. The "output" of `@lavamoat/node` should be considered the output of
 * the program being executed; thus `@lavamoat/node` should not use `stdout` for
 * its own output.
 *
 * @type {NodeJS.WritableStream[]}
 */
const streams = new Array(8).fill(process.stderr)

export const log = new Loggerr({
  formatter: 'cli',
  streams,
  level: Loggerr.INFO,
})
