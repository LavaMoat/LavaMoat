/** @import {GeneratorOptions} from '@babel/generator' */
/** @typedef {import('webpack').sources.Source} Source */ // @import syntax would import all of source and cause trouble.

const { parse } = require('@babel/parser')
const { default: traverse } = require('@babel/traverse')
const { generate } = require('@babel/generator')
const {
  makeEvasiveTransformVisitor,
} = require('@endo/evasive-transform/visitor.js')
// The ESM package boundary retains Node's visitor while legacy policy scanning
// can still recognize its .js extension.
const { createExecVisitor } = require('./esm/exec-visitor')
const {
  sources: { SourceMapSource },
} = require('webpack')

// Detection patterns based on SES transforms
const importPatternString = 'import\\s*(?:\\(|\\.|/[/*])'
const htmlCommentPatternString = `(?:${'<'}!--|--\\s*${'>'})`
const evalPatternString = '\\beval\\s*\\('

/**
 * Combined detection regex — non-global, used only for `.test()`. Single engine
 * pass for the common case (no match).
 */
const NEEDS_TRANSFORM = new RegExp(
  // The `?:` avoids capture groups since only the presence of a match matters.
  // `\\\\` matches a literal backslash: escapes can hide relevant syntax.
  `(?:${importPatternString}|${htmlCommentPatternString}|${evalPatternString}|^#!|\\\\)`
  // No `g`: we only need one match and do not need to track lastIndex.
)

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
 * Applies Endo's visitor and the Node execution visitor while preserving the
 * webpack source map. The execution visitor is a candidate for extraction
 * shared between the packages.
 *
 * @param {Source} webpackSource - The original webpack Source object
 * @param {string} sourceString - The already-extracted source string (avoids
 *   re-calling .source())
 * @param {string} sourceName
 * @returns {Source | string} Transformed source, or the original string if unchanged.
 */
function applySourceTransforms(webpackSource, sourceString, sourceName) {
  if (!needsTransform(sourceString)) {
    return sourceString
  }

  const ast = parse(sourceString, {
    allowReturnOutsideFunction: true,
    createParenthesizedExpressions: true,
    sourceType: 'unambiguous',
    tokens: true,
  })

  traverse(ast, makeEvasiveTransformVisitor())
  traverse(ast, createExecVisitor().visitor)

  /** @type {GeneratorOptions & { experimental_preserveFormat: boolean }} */
  const generatorOptions = {
    experimental_preserveFormat: true,
    retainLines: true,
    sourceFileName: sourceName,
    sourceMaps: true,
  }
  const { code, map } = generate(ast, generatorOptions, sourceString)
  if (code === sourceString) {
    return sourceString
  }
  if (!map) {
    throw new Error(`Failed to generate source map for ${sourceName}`)
  }

  return new SourceMapSource(
    code,
    sourceName,
    map,
    sourceString,
    webpackSource.map()
  )
}

module.exports = { applySourceTransforms, needsTransform }
