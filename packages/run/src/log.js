/**
 * Provides a {@link log logger} which writes exclusively to `stderr`.
 *
 * @remarks
 * As with `@lavamoat/node`, the "output" of `@lavamoat/run` is the output of
 * the program it executes; everything `@lavamoat/run` emits about its own
 * behavior must go to `stderr` so it never pollutes the program's `stdout`.
 * @packageDocumentation
 */

import { Loggerr } from 'loggerr'

/**
 * The `@lavamoat/run` logger.
 *
 * Every log level is routed to {@link process.stderr}.
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
  level: process.env.LAVAMOAT_DEBUG ? Loggerr.DEBUG : Loggerr.INFO,
})

export { Loggerr }
