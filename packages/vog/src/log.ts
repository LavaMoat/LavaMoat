/**
 * Provides a {@link log nice logger}.
 *
 * @packageDocumentation
 * @see {@link https://www.npmjs.com/package/consola consola}
 */

import { type ConsolaOptions, createConsola, LogLevels } from 'consola'

const { freeze } = Object

/**
 * Default options for the default logger.
 *
 * Exported so that you can reuse it to create another instance.
 */
const defaultOptions = freeze({
  level: process.env.LAVAMOAT_DEBUG ? LogLevels.debug : LogLevels.info,
  formatOptions: {
    timestamp: false,
    date: false,
  },
  fancy: true,
  stdout: process.stderr,
} as const) satisfies Readonly<
  Partial<
    ConsolaOptions & {
      fancy: boolean
    }
  >
>

/**
 * This is the default logger.
 *
 * It will _only_ log to stderr; _never_ to stdout. If you want to log to
 * stdout, you can use `const myLog = log.create({ stdout: process.stdout })` to
 * create a new logger.
 *
 * Any log level _less than 2_ (starting with {@link LogLevels.warn}) will
 * _always_ log to stderr—regardless of configuration.
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
  type ConsolaOptions,
}
