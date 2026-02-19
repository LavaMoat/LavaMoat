/**
 * Provides {@link syncModuleTransforms}, which is a standard set of module
 * transforms provided to `@endo/compartment-mapper`.
 *
 * @packageDocumentation
 * @internal
 */

import { evadeCensorSync } from '../../../../../endo/packages/evasive-transform/index.js'

const decoder = new TextDecoder()
const encoder = new TextEncoder()

const { URL } = globalThis

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
 * Hashbangs seem to offend SES.
 *
 * @param {string} source
 * @returns {string}
 */
const decapitateHashbang = (source) => {
  // careful with the source map
  return source.replace(/^#!(.+?)(?=\r?\n)/, '// $1')
}

/**
 * Apply local transforms to source code
 *
 * @param {string} source
 * @returns {string}
 */
export const useLocalTransforms = (source) => {
  source = decapitateHashbang(source)
  source = evadeDirectEvalExpressions(source)

  return source
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
    source = useLocalTransforms(source)
    const { code, map } = evadeCensorSync(source, {
      // elideComments: true, would clean up a lot
      sourceMap: opts?.sourceMap,
      sourceUrl: new URL(specifier, location).href,
      sourceType: parser === 'mjs' ? 'module' : 'script',
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
