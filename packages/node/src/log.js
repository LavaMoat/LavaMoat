/**
 * Provides a {@link log nice logger}.
 *
 * @packageDocumentation
 */

import {
  createLogger as createVogLogger,
  LogLevels,
} from '@lavamoat/vog/log.js'

/**
 * @import {
 *   Logger,
 *   LoggerOptions
 * } from "@lavamoat/vog/log.js"
 */

/**
 * Whether warnings are currently enabled.
 *
 * Consulted by the filter reporter to decide whether `warn`-type log entries
 * should be forwarded to the underlying reporters.
 *
 * @type {boolean}
 */
let warningsEnabled = true

/**
 * Factory function to create a new logger that writes exclusively to stderr.
 *
 * The returned instance uses consola's default (env-aware) reporters, wrapped
 * in a thin filter reporter that can suppress `warn`-level output when
 * {@link disableWarnings} has been called.
 *
 * @param {Partial<LoggerOptions>} [options]
 * @returns {Logger}
 */
export const createLogger = (options) => {
  const instance = createVogLogger({
    level: process.env.LAVAMOAT_DEBUG ? LogLevels.debug : LogLevels.info,
    formatOptions: {
      timestamp: false,
      date: false,
    },
    stdout: process.stderr,
    ...options,
  })

  const originalReporters = [...instance.options.reporters]

  instance.setReporters([
    {
      log(logObj, ctx) {
        if (!warningsEnabled && logObj.type === 'warn') {
          return
        }
        for (const reporter of originalReporters) {
          reporter.log(logObj, ctx)
        }
      },
    },
  ])

  return instance
}

/**
 * Default logger instance.
 *
 * Always writes to stderr; never to stdout. Uses consola's default fancy
 * reporter in interactive terminals, with a filter that can suppress warnings
 * via {@link disableWarnings}.
 */
export const log = createLogger()

/**
 * Disables warning output on the default logger.
 *
 * Subsequent calls to `log.warn(...)` will be silently dropped while all other
 * log levels (`log.info`, `log.error`, `log.debug`, etc.) continue to work.
 *
 * This operates on the module-level `warningsEnabled` flag shared by the filter
 * reporter installed on every logger created by {@link createLogger}.
 *
 * @returns {void}
 */
export const disableWarnings = () => {
  warningsEnabled = false
}

export { LogLevels }
