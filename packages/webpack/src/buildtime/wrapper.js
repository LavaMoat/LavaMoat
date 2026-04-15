const { applySourceTransforms } = require('lavamoat-core')
const diag = require('./diagnostics')
const fs = require('node:fs')
const q = JSON.stringify
const {
  sources: { ReplaceSource, SourceMapSource, RawSource },
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

/**
 * Computes the character-level diff between two strings and returns an array of
 * replacement operations (start, end, content) suitable for ReplaceSource.
 *
 * @param {string} original - The original string
 * @param {string} transformed - The transformed string
 * @returns {{ start: number; end: number; content: string }[]}
 */
function diffReplacements(original, transformed) {
  const replacements = []
  let i = 0
  let j = 0

  while (i < original.length && j < transformed.length) {
    if (original[i] === transformed[j]) {
      i++
      j++
    } else {
      // Found a difference — find where it ends
      const diffStart = i

      // Look ahead to find the next sync point
      // Try increasing window sizes to find where the strings re-align
      let foundSync = false
      for (let window = 1; window <= 20 && !foundSync; window++) {
        for (let oi = 0; oi <= window; oi++) {
          const ti = window - oi
          if (
            i + oi < original.length &&
            j + ti < transformed.length &&
            original[i + oi] === transformed[j + ti]
          ) {
            // Verify this is a real sync point (check a few more chars)
            let isSync = true
            for (let k = 1; k < Math.min(3, original.length - i - oi); k++) {
              if (original[i + oi + k] !== transformed[j + ti + k]) {
                isSync = false
                break
              }
            }
            if (isSync) {
              const endExclusive = i + oi
              const content = transformed.slice(j, j + ti)
              replacements.push({
                start: diffStart,
                end: endExclusive - 1,
                content,
              })
              i = endExclusive
              j = j + ti
              foundSync = true
              break
            }
          }
        }
      }
      if (!foundSync) {
        // Can't find sync — treat the rest as one big replacement
        replacements.push({
          start: diffStart,
          end: original.length - 1,
          content: transformed.slice(j),
        })
        return replacements
      }
    }
  }

  // Handle trailing content
  if (i < original.length || j < transformed.length) {
    replacements.push({
      start: i,
      end: original.length - 1,
      content: transformed.slice(j),
    })
  }

  return replacements
}

/**
 * Applies SES source transforms while preserving sourcemap data. Uses
 * lavamoat-core's applySourceTransforms as the source of truth for what to
 * transform, then diffs the original and transformed strings to compute
 * positional replacements for webpack's ReplaceSource.
 *
 * @param {Source} originalSource - The original webpack source object
 * @returns {{ source: Source; sourceStr: string }}
 */
function applySesTransforms(originalSource) {
  const { source, map } = originalSource.sourceAndMap()
  const sourceStr = source.toString()
  const transformedStr = applySourceTransforms(sourceStr)

  if (sourceStr === transformedStr) {
    return { source: originalSource, sourceStr }
  }

  // Flatten the source so that character positions match what ReplaceSource
  // expects. Without this, compound sources (e.g. a ReplaceSource from
  // webpack's generator) have internal positions that don't correspond to
  // their flattened string output.
  const flatSource = map
    ? new SourceMapSource(sourceStr, 'lavamoat-ses-transforms', map)
    : new RawSource(sourceStr)

  const replaceSource = new ReplaceSource(flatSource)

  const replacements = diffReplacements(sourceStr, transformedStr)

  for (const { start, end, content } of replacements) {
    replaceSource.replace(start, end, content)
  }

  return { source: replaceSource, sourceStr: transformedStr }
}

/**
 * @param {WrappingInput} params
 * @returns {{
 *   before: string
 *   after: string
 *   source: Source
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

  const { source: transformedSource, sourceStr: sesCompatibleStr } =
    applySesTransforms(source)

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
    validateSource(sesCompatibleStr)
  }
  return {
    before,
    source: transformedSource,
    after,
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
