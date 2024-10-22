/**
 * Provides {@link syncModuleTransforms}, which is a standard set of module
 * transforms provided to `@endo/compartment-mapper`.
 *
 * @packageDocumentation
 */

import { evadeCensorSync } from '@endo/evasive-transform'
import { applySourceTransforms } from 'lavamoat-core'

const decoder = new TextDecoder()
const encoder = new TextEncoder()

/**
 * @import {SyncModuleTransform, Language} from '@endo/compartment-mapper'
 */

/**
 * Create a module transform which performs source transforms to evade SES
 * restrictions
 *
 * @param {Language} parser
 * @returns {SyncModuleTransform}
 * @internal
 */
const createModuleTransform = (parser) => {
  return (sourceBytes, specifier, location, _packageLocation, opts) => {
    let source = decoder.decode(sourceBytes)
    // FIXME: this function calls stuff we could get in `ses/tools.js`
    // except `evadeDirectEvalExpressions`. unclear if we should be using this from `lavamoat-core`
    source = applySourceTransforms(source)
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
