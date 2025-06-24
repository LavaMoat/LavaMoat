/**
 * Formatting utilities
 *
 * @packageDocumentation
 */

import { colors, stripAnsi } from '@lavamoat/vog'
import nodePath from 'node:path'
import { toPath } from './util.js'

export { stripAnsi }

/**
 * @import {ColorFunction} from '@lavamoat/vog'
 */

/**
 * Colorizes a string based on a delimiter.
 *
 * Strings containing escapes will have those escapes stripped first
 *
 * @param {string} value
 * @param {{
 *   delimiter?: string
 *   color?: ColorFunction
 *   delimiterColor?: ColorFunction
 * }} [options]
 * @returns {string} Colorized string
 * @internal
 */

export const colorSplit = (
  value,
  {
    delimiter = '>',
    color = colors.whiteBright,
    delimiterColor = colors.gray,
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
    color: colors.greenBright,
    delimiterColor: colors.green,
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
    color: colors.magentaBright,
    delimiterColor: colors.magenta,
  })

/**
 * Formats "code"; use when referring to code or configuration
 *
 * @param {string} value
 * @returns {string}
 * @internal
 */
export const hrCode = (value) => colors.bgBlackBright(colors.whiteBright(value))
