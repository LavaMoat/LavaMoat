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
 * @returns {string} Human-readable path
 * @internal
 */
export const hrPath = (filepath) => {
  filepath = toPath(filepath)
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
  return colorSplit(filepath, {
    delimiter: nodePath.sep,
    color: chalk.greenBright,
    delimiterColor: chalk.green,
  })
}

/**
 * For display of package names or canonical names.
 *
 * @param {string} name
 * @returns {string}
 * @internal
 */
export const hrLabel = (name) =>
  colorSplit(name, {
    delimiter: '>',
    color: chalk.magentaBright,
    delimiterColor: chalk.magenta,
  })

/**
 * Formats "code"; use when referring to code or configuration
 *
 * @param {string} value
 * @returns {string}
 * @internal
 */
export const hrCode = chalk.bgGrey.whiteBright
