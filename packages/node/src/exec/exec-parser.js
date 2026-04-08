/**
 * Provides {@link createExecParser}, a synchronous composed parser for the
 * execution path.
 *
 * Folds evasive-transform and module-source visitors into a single Babel
 * parse-traverse-generate cycle for ESM modules. No tofu visitors -- policy
 * inspection only happens during policy generation, not execution.
 *
 * @packageDocumentation
 * @internal
 */

/**
 * @import {RecordBuilder} from '@endo/parser-pipeline'
 * @import {ParserImplementation} from '@endo/compartment-mapper'
 */

import { createEvasiveTransformPass } from '@endo/evasive-transform'
import { createModuleSourcePasses } from '@endo/module-source'
import { createComposedParser } from '@endo/parser-pipeline'
import { useLocalTransforms } from '../compartment/module-transforms.js'

/**
 * Creates a synchronous `ParserImplementation` for ESM modules that performs
 * evasive transforms and module-source analysis in a single parse.
 *
 * @returns {ParserImplementation}
 */
export const createExecParser = () => {
  /** @type {ModuleSourcePassesResult} */
  let currentModuleSourceState

  /** @type {RecordBuilder} */
  const recordBuilder = (generatedCode, location) => {
    if (!currentModuleSourceState) {
      throw new Error(
        'Module source state not initialized; cannot build record'
      )
    }
    return currentModuleSourceState.buildRecord(generatedCode, location)
  }

  return createComposedParser(recordBuilder, {
    analyzerFactories: [
      (_location, _specifier) => {
        currentModuleSourceState = createModuleSourcePasses()
        return currentModuleSourceState.analyzerPass
      },
    ],
    transformFactories: [
      (_location, _specifier) => createEvasiveTransformPass(),
      (_location, _specifier) => {
        if (!currentModuleSourceState) {
          throw new Error(
            'Module source state not initialized; analyzer factory must run first'
          )
        }
        return currentModuleSourceState.transformPass
      },
    ],
    sourcePreprocessor: useLocalTransforms,
  })
}
