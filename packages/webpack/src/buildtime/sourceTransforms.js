/** @typedef {import('webpack').sources.Source} Source */

const {
  sources: { ReplaceSource },
} = require('webpack')

/**
 * @typedef {object} TransformEntry
 * @property {RegExp} pattern - Global regex pattern to match against source
 * @property {(match: RegExpMatchArray) => string} replaceFn - Receives the
 *   matchAll result, returns replacement string
 */

// Patterns copied from SES transforms (transforms.umd.js)
const importPatternString = '\\bimport(\\s*(?:\\(|/[/*]))'
const htmlCommentPatternString = `(?:${'<'}!--|--${'>'})`
const evalPatternString = '\\beval(\\s*\\()'

const htmlCommentPattern = new RegExp(htmlCommentPatternString, 'g')
const importPattern = new RegExp(importPatternString, 'g')
const evalPattern = new RegExp(evalPatternString, 'g')

/**
 * Combined detection regex — non-global, used only for `.test()`. Single engine
 * pass for the common case (no match).
 */
const NEEDS_TRANSFORM = new RegExp(
  // the `?:` is to avoid unnecessary capture groups since we only care about the presence of a match, not the details
  `(?:${importPatternString}|${htmlCommentPatternString}|${evalPatternString})`
  // note no `g` here - we only need to find one match and avoid worrying about lastIndex
)

/** @type {TransformEntry[]} */
const SES_TRANSFORMS = [
  {
    pattern: htmlCommentPattern,
    replaceFn: (match) => (match[0][0] === '<' ? '< ! --' : '-- >'),
  },
  {
    pattern: importPattern,
    replaceFn: (match) => `__import__${match[1]}`,
  },
  {
    pattern: evalPattern,
    replaceFn: (match) => `(0,eval)${match[1]}`,
  },
]

/**
 * Cheap detection — returns true if source may need any SES transforms.
 *
 * @param {string} sourceString
 * @returns {boolean}
 */
function needsTransform(sourceString) {
  return NEEDS_TRANSFORM.test(sourceString)
}

/**
 * Generic sourcemap-preserving transform using webpack's ReplaceSource. Applies
 * all matching replacements from the given transforms list.
 *
 * @param {Source} webpackSource - The original webpack Source object
 * @param {string} sourceString - The already-extracted source string (avoids
 *   re-calling .source())
 * @param {TransformEntry[]} transforms - Array of { pattern, replaceFn }
 *   entries
 * @returns {Source}
 */
function applyReplaceTransforms(webpackSource, sourceString, transforms) {
  const replaceSource = new ReplaceSource(webpackSource)

  for (const { pattern, replaceFn } of transforms) {
    // Reset lastIndex in case the regex was used before
    pattern.lastIndex = 0
    for (const match of sourceString.matchAll(pattern)) {
      const start = /** @type {number} */ (match.index)
      const end = start + match[0].length - 1
      replaceSource.replace(start, end, replaceFn(match))
    }
  }

  return replaceSource
}

module.exports = {
  NEEDS_TRANSFORM,
  SES_TRANSFORMS,
  needsTransform,
  applyReplaceTransforms,
}
