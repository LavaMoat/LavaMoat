const diag = require('./diagnostics')
const fs = require('node:fs')
const q = JSON.stringify
const {
  sources: { ReplaceSource },
} = require('webpack')

/**
 * Flags enabling runtime features based on webpack's runtime requirements.
 * Using this decouples the concept of runtime requirements from wrapper.
 *
 * @typedef {object} RuntimeFlags
 * @property {boolean} [thisAsExports]
 */
/**
 * @typedef {import('webpack').sources.Source} Source
 */
/**
 * @typedef {object} WrappingInput
 * @property {Source} source
 * @property {string} id
 * @property {string[] | Set<string>} runtimeKit
 * @property {string} evalKitFunctionName
 * @property {boolean} [runChecks]
 * @property {RuntimeFlags} [runtimeFlags]
 */

const {
  NAME_globalThis,
  NAME_scopeTerminator,
  NAME_runtimeHandler,
} = require('../ENUM.json')

// Regex patterns matching those used by lavamoat-core's applySourceTransforms
// and evadeDirectEvalExpressions. These must be kept in sync.
// Ideally we should import these from lavamoat-core.
const htmlCommentPattern = /(?:<!--|-->)/g
const importPattern = /\bimport(\s*(?:\(|\/[/*]))/g
const evalPattern = /\beval(\s*\()/g

/**
 * Applies SES source transforms using ReplaceSource to preserve sourcemap data.
 * This re-implements the same replacements as lavamoat-core's
 * applySourceTransforms and evadeDirectEvalExpressions, but operates on
 * positional replacements so that webpack's sourcemap pipeline can track the
 *
 * @param {Source} originalSource - The original webpack source object with
 *   sourcemap
 * @returns {{ source: Source; sourceStr: string; sourceChanged: boolean }}
 */
function applySesTransforms(originalSource) {
  const sourceStr = originalSource.source().toString()
  let sourceChanged = false
  let match

  const replaceSource = new ReplaceSource(originalSource)

  // evadeHtmlCommentTest: <!-- → < ! -- and --> → -- >
  htmlCommentPattern.lastIndex = 0
  while ((match = htmlCommentPattern.exec(sourceStr)) !== null) {
    const replacement = match[0][0] === '<' ? '< ! --' : '-- >'
    replaceSource.replace(
      match.index,
      match.index + match[0].length - 1,
      replacement
    )
    sourceChanged = true
  }

  // evadeImportExpressionTest: import → __import__ (preserve trailing whitespace/paren)
  importPattern.lastIndex = 0
  while ((match = importPattern.exec(sourceStr)) !== null) {
    // Only replace the 'import' keyword (6 chars), keep the capture group
    replaceSource.replace(match.index, match.index + 5, '__import__')
    sourceChanged = true
  }

  // evadeDirectEvalExpressions: eval → (0,eval) (preserve trailing whitespace/paren)
  evalPattern.lastIndex = 0
  while ((match = evalPattern.exec(sourceStr)) !== null) {
    // Only replace the 'eval' keyword (4 chars), keep the capture group
    replaceSource.replace(match.index, match.index + 3, '(0,eval)')
    sourceChanged = true
  }

  return {
    source: sourceChanged ? replaceSource : originalSource,
    sourceStr: sourceChanged ? replaceSource.source().toString() : sourceStr,
    sourceChanged,
  }
}

/**
 * @param {WrappingInput} params
 * @returns {{
 *   before: string
 *   after: string
 *   source: Source
 *   sourceChanged: boolean
 * }}
 */
exports.wrapper = function wrapper({
  source,
  id,
  runtimeKit,
  evalKitFunctionName,
  runChecks = true,
  runtimeFlags = {},
}) {
  const runtimeKitArray = Array.from(runtimeKit)

  const {
    source: transformedSource,
    sourceStr,
    sourceChanged,
  } = applySesTransforms(source)

  // This adds support for mapping `this` to `exports` or `module.exports` if webpack detected it's necessary
  let optionalBinding = ''

  if (runtimeFlags.thisAsExports) {
    if (runtimeKitArray.includes('exports')) {
      optionalBinding = '.bind(exports)'
    } else if (runtimeKitArray.includes('module')) {
      optionalBinding = '.bind(module.exports)'
    }
  }

  // TODO: Consider: We could save some bytes by merging scopeTerminator and runtimeHandler, but then runtime calls would go through a proxy, which is slower. Merging runtimeKit with globalThis would also be problematic.

  // return NO-OP if runtime didn't produce a scope terminator

  // Here we triple backflip using `with` statements to create a restricted scope chain to construct an isolated strict fn that wraps the module source.
  // In similar manner to: https://github.com/endojs/endo/blob/master/packages/ses/src/make-evaluate.js#L92-L107

  const before = `(function(){
     if (!this.${NAME_scopeTerminator}) return ()=>{};
     with (this.${NAME_scopeTerminator}) {
      with (this.${NAME_runtimeHandler}) {
      with (this.${NAME_globalThis}) {
        return function() { 'use strict';
`

  const after = `
        };
      }
    }
    }
}).call(${evalKitFunctionName}(${q(id)}, { ${runtimeKitArray.join(
    ','
  )}}))${optionalBinding}()`
  if (runChecks) {
    validateSource(sourceStr)
  }
  return {
    before,
    after,
    source: transformedSource,
    sourceChanged,
  }
}

/**
 * Validates the source by creating a Function from it
 *
 * @param {string} source
 */
function validateSource(source) {
  const validityFlag = 'E_VALIDATION' + Math.random().toFixed(10)
  // If wrapping results with invalid JS, webpack may not report that at later stages
  // or we might get an error complaining about with in strict mode even if the issue is mismatching curlies
  try {
    // This used to be
    // Function(`{throw "${validityFlag}"};;` + source)()
    // but function constructor should suffice to report parsing errors
    Function(source)
  } catch (e) {
    diag.run(2, () => {
      fs.writeFileSync(
        validityFlag + '.js',
        source +
          `
/*
${e}
*/
        `
      )
    })
    throw Error(validityFlag + ': wrapped module is not valid JS\n' + e)
  }
}
