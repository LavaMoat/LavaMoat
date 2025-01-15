/**
 * Provides {@link syncModuleTransforms}, which is a standard set of module
 * transforms provided to `@endo/compartment-mapper`.
 *
 * @packageDocumentation
 * @internal
 */

import { evadeCensorSync } from '@endo/evasive-transform'
import { applySourceTransforms } from 'lavamoat-core'

const decoder = new TextDecoder()
const encoder = new TextEncoder()

/**
 * @import {SyncModuleTransform, Language} from '@endo/compartment-mapper'
 */

/**
 * @param {string} _
 * @param {string} p1
 * @returns {string}
 */
const DIRECT_EVAL_REPLACE_FN = (_, p1) => '(0,eval)' + p1

/**
 * @param {string} source
 * @returns {string}
 */
const evadeDirectEvalExpressions = (source) => {
  return source.replace(/\beval(\s*\()/g, DIRECT_EVAL_REPLACE_FN)
}

/**
 * Evade things that look like HTML comments but are actually decrement
 * operators used in boolean "less than" expressions
 *
 * @remarks
 * TODO: Remove once Endo consumes "preserveFormat"
 * @param {string} source
 * @returns {string}
 */
const evadeGibson = (source) => {
  return source.replace(
    /([$_a-zA-Z0-9]+)--\s+>(?=\s*[$_a-zA-Z0-9]+)/g,
    '[$1--][0] >'
  )
}

/**
 * Evades SES restrictions on `import`+`(` in strings by replacing `(` with a
 * gremlin
 *
 * @remarks
 * TODO: Remove once Endo consumes "preserveFormat"
 * @param {string} source
 * @returns {string}
 */
const evadeImportString = (source) => {
  return source.replace(/(?<=[`"'][\w\d\s,-]*)import\(/g, 'import（')
}

/**
 * Create a module transform which performs source transforms to evade SES
 * restrictions
 *
 * @param {Language} parser
 * @returns {SyncModuleTransform}
 */
const createModuleTransform = (parser) => {
  return (sourceBytes, specifier, location, _packageLocation, opts) => {
    let source = decoder.decode(sourceBytes)
    // FIXME: this function calls stuff we could get in `ses/tools.js`
    // except `evadeDirectEvalExpressions`. unclear if we should be using this from `lavamoat-core`
    source = applySourceTransforms(source)
    source = evadeDirectEvalExpressions(source)
    source = evadeGibson(source)
    source = evadeImportString(source)
    const { code, map } = evadeCensorSync(source, {
      sourceMap: opts?.sourceMap,
      sourceUrl: new URL(specifier, location).href,
      sourceType: 'module',
    })
    const objectBytes = encoder.encode(code)
    return { bytes: objectBytes, parser, map }
  }
}

/**
 * Standard set of module transforms for our purposes
 *
 * @internal
 */
export const syncModuleTransforms = /** @type {const} */ ({
  cjs: createModuleTransform('cjs'),
  mjs: createModuleTransform('mjs'),
})
