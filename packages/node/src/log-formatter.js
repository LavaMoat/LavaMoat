/**
 * Custom formatter for Loggerr which doesn't trim multiline messages.
 *
 * @packageDocumentation
 * @internal
 */

import util from 'node:util'
import chalk from 'chalk'

/**
 * @internal
 */
export function createFormatter() {
  const opts = /** @type {const} */ ({
    colors: true,
    levels: {
      emergency: 'red',
      alert: 'red',
      critical: 'red',
      error: 'red',
      warning: 'yellow',
      notice: 'yellow',
      info: 'cyan',
      debug: 'cyan',
    },
    errorLevels: new Set(['error', 'critical', 'alert', 'emergency']),
  })

  /**
   * @param {Date} _date
   * @param {string} level
   * @param {Record<string, any>} data
   * @returns {string}
   */
  return (_date, level, data) => {
    const color =
      chalk[opts.levels[/** @type {keyof typeof opts.levels} */ (level)]] ||
      chalk.white

    // level formatting
    const l =
      color.underline(level) + Array(Math.max(8 - level.length, 0)).join(' ')

    /** @type {string[]} */
    let lines = data.msg.split('\n')
    const firstLine = lines.shift() ?? ''

    // display stack trace for errors levels
    if (opts.errorLevels.has(level) && 'err' in data && data.err?.stack) {
      // Remove multi-line message from stack
      const stack = data.err.stack.replace(data.msg, firstLine)
      lines = lines.concat(stack.split('\n'))
    }

    // dim and trim all but first line
    lines = lines.map((s) => chalk.grey(s))
    const finallines = [firstLine, ...lines].join('\n')

    // format details
    const details = Object.keys(data).reduce((str, key) => {
      // dont display the message or error in details
      if (key !== 'msg' && key !== 'err') {
        str += `\n  ${chalk.grey('-')} ${key}: ${util.inspect(data[key], { colors: true })}`
      }
      return str
    }, '')

    return `${l} ${chalk.grey('›')} ${finallines} ${details}\n`
  }
}
