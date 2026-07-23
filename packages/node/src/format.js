/**
 * Formatting utilities
 *
 * @packageDocumentation
 */

import chalk from 'chalk'
import nodePath from 'node:path'
import { stripVTControlCharacters as stripAnsi } from 'node:util'
import { toPath } from './util.js'

export { stripAnsi }

/**
 * @import {ChalkFunction} from 'chalk'
 */

/**
 * Colorizes a string based on a delimiter.
 *
 * Strings containing escapes will have those escapes stripped first
 *
 * @param {string} value
 * @param {{
 *   delimiter?: string
 *   color?: ChalkFunction
 *   delimiterColor?: ChalkFunction
 * }} [options]
 * @returns {string} Colorized string
 * @internal
 */

export const colorSplit = (
  value,
  {
    delimiter = '>',
    color = chalk.whiteBright,
    delimiterColor = chalk.gray,
  } = {}
) =>
  stripAnsi(value)
    .split(delimiter)
    .map((part) => color(part))
    .join(delimiterColor(delimiter))

/**
 * Given a filepath, displays it as relative or absolute depending on which is
 * fewer characters. Ergo, the "human-readable" path.
 *
 * If relative to the current directory, it will be prefixed with `./`.
 *
 * Path delimiters are platform-aware.
 *
 * @param {string | URL} filepath Path to display
 * @param {boolean} [colorOnly] If true, only color the path; don't optimize for
 *   length
 * @returns {string} Human-readable path
 */
export const hrPath = (filepath, colorOnly) => {
  filepath = toPath(filepath)
  if (!colorOnly) {
    if (nodePath.isAbsolute(filepath)) {
      const relativePath = nodePath.relative(process.cwd(), filepath)
      if (relativePath.length < filepath.length) {
        filepath = relativePath.startsWith('..')
          ? relativePath
          : `.${nodePath.sep}${relativePath}`
      }
    } else {
      const absolutePath = nodePath.resolve(filepath)
      if (absolutePath.length < filepath.length) {
        filepath = absolutePath
      } else {
        filepath = filepath.startsWith('..')
          ? filepath
          : `.${nodePath.sep}${filepath}`
      }
    }
  }
  return colorSplit(
    colorSplit(filepath, {
      delimiter: nodePath.sep,
      color: chalk.greenBright,
      delimiterColor: chalk.green,
    }),
    { delimiter: ':', color: chalk.greenBright, delimiterColor: chalk.green }
  )
}

/**
 * For display of package names or canonical names.
 *
 * @param {string} name
 * @returns {string}
 */
export const hrLabel = (name, dim = false) =>
  colorSplit(name, {
    delimiter: '>',
    color: dim ? chalk.magentaBright.dim : chalk.magentaBright,
    delimiterColor: dim ? chalk.magenta.dim : chalk.magenta,
  })

/**
 * Formats "code"; use when referring to code or configuration
 *
 * @param {string} value
 * @returns {string}
 */
export const hrCode = chalk.cyan.bold

/**
 * Formats a success symbol.
 *
 * @returns {string}
 * @internal
 */

export const success = chalk.greenBright.bold('✓')

/**
 * Formats an "action" message.
 *
 * @returns {string}
 * @internal
 */
export const action = chalk.bold

/**
 * Formats a string for emphasis.
 *
 * @internal
 */
export const emphasis = chalk.italic

/**
 * Formats a string for deemphasis.
 *
 * @internal
 */
export const deemphasis = chalk.dim

/**
 * Array of spinner characters.
 *
 * @internal
 */
export const spinnerChars = ['◰', '◳', '◲', '◱']

/**
 * Formats a spinner.
 *
 * @returns {string}
 * @internal
 */
export const spinner = chalk.magentaBright.bold

/**
 * Formats a hazard symbol.
 *
 * @returns {string}
 * @internal
 */
export const hazard = chalk.yellowBright.bold('⚠')

/**
 * Formats a chevron symbol.
 *
 * @returns {string}
 * @internal
 */
export const chevron = chalk.blackBright('›')

/**
 * Clears the current line.
 *
 * @returns {void}
 * @internal
 */
export const clearLine = () => {
  process.stderr.write('\r\x1b[2K')
}

/**
 * Formats a duration in seconds as a human-readable string.
 *
 * @param {number} duration Duration in ms
 * @returns {string} Human-readable duration in seconds
 * @internal
 */
export const seconds = (duration) => `${hrCode(`~${duration.toFixed(2)}`)}`
