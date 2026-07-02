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
 * Composes a list of color/transform functions right-to-left, so that the
 * leftmost function is applied last (outermost wrap).
 *
 * @param {...((s: string) => string)} fns
 * @returns {(s: string) => string}
 */
const compose =
  (...fns) =>
  (s) =>
    fns.reduceRight((acc, fn) => fn(acc), String(s))

/**
 * Colorizes a string based on a delimiter.
 *
 * Strings containing escapes will have those escapes stripped first
 *
 * @param {string} value
 * @param {{
 *   delimiter?: string
 *   color?: (s: string) => string
 *   delimiterColor?: (s: string) => string
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
 * @param {boolean} [colorOnly] If true, only color the path; don't optimize for
 *   length
 * @returns {string} Human-readable path
 * @internal
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
      color: colors.greenBright,
      delimiterColor: colors.green,
    }),
    { delimiter: ':', color: colors.greenBright, delimiterColor: colors.green }
  )
}

/**
 * For display of package names or canonical names.
 *
 * @param {string} name
 * @returns {string}
 * @internal
 */
export const hrLabel = (name, dim = false) =>
  colorSplit(name, {
    delimiter: '>',
    color: dim
      ? compose(colors.dim, colors.magentaBright)
      : colors.magentaBright,
    delimiterColor: dim ? compose(colors.dim, colors.magenta) : colors.magenta,
  })

/**
 * Formats "code"; use when referring to code or configuration
 *
 * @param {string | number} value
 * @returns {string}
 * @internal
 */
export const hrCode = compose(colors.bold, colors.cyan)

/**
 * Formats "code" in a dimmed style.
 *
 * @param {string | number} value
 * @returns {string}
 * @internal
 */
export const hrCodeDim = compose(colors.dim, colors.bold, colors.cyan)

/**
 * Formats a success symbol.
 *
 * @returns {string}
 * @internal
 */

export const success = compose(colors.bold, colors.greenBright)('✓')

/**
 * Formats an "action" message.
 *
 * @returns {string}
 * @internal
 */
export const action = colors.bold

/**
 * Formats a string for emphasis.
 *
 * @internal
 */
export const emphasis = colors.italic

/**
 * Formats a string for deemphasis.
 *
 * @internal
 */
export const deemphasis = colors.dim

/**
 * Array of spinner characters.
 *
 * @internal
 */
export const spinnerChars = ['◰', '◳', '◲', '◱']

/**
 * Formats a spinner character string.
 *
 * @returns {string}
 * @internal
 */
export const spinner = compose(colors.bold, colors.magentaBright)

/**
 * Formats a hazard symbol.
 *
 * @returns {string}
 * @internal
 */
export const hazard = compose(colors.bold, colors.yellowBright)('⚠')

/**
 * Formats a chevron symbol.
 *
 * @returns {string}
 * @internal
 */
export const chevron = colors.blackBright('›')

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
