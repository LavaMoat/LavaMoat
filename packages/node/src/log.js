/**
 * Provides a {@link log nice logger}.
 *
 * @packageDocumentation
 */

import { Loggerr } from 'loggerr'

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
export const log = new Loggerr({
  formatter: 'cli',
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
  level: Loggerr.INFO,
})
