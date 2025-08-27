/**
 * Provides a {@link log nice logger}.
 *
 * @packageDocumentation
 */

import { ConsolaOptions, createConsola, LogLevels } from 'consola'

const { freeze } = Object

/**
 * Default options for the default logger.
 *
 * Exported so that you can reuse it to create another instance.
 */
const defaultOptions: Readonly<
  Partial<
    ConsolaOptions & {
      fancy: boolean
    }
  >
> = freeze({
  level: process.env.LAVAMOAT_DEBUG ? LogLevels.debug : LogLevels.info,
  formatOptions: {
    timestamp: false,
    date: false,
  },
  fancy: true,
  stdout: process.stderr,
})

/**
 * This is the default logger.
 *
 * It will _only_ log to stderr; never to stdout. If you want to log to stdout,
 * you can use `const myLog = log.create({ stdout: process.stdout })` to create
 * a new logger; note that any log level _less than 2_ (starting with
 * {@link LogLevels.warn}) will still log to stderr.
 */
const log = createConsola({
  level: process.env.LAVAMOAT_DEBUG ? LogLevels.debug : LogLevels.info,
  formatOptions: {
    timestamp: false,
    date: false,
  },
  stdout: process.stderr,
})

export type Logger = typeof log

export {
  log as defaultLog,
  defaultOptions as defaultLoggerOptions,
  log,
  LogLevels,
}
