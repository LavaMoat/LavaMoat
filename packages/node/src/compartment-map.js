import { captureFromMap } from '@endo/compartment-mapper/capture-lite.js'
import { defaultParserForLanguage } from '@endo/compartment-mapper/import-parsers.js'
import { mapNodeModules } from '@endo/compartment-mapper/node-modules.js'
import { NATIVE_PARSER_FILE_EXT, NATIVE_PARSER_NAME } from './constants.js'
import { importHook, importNowHook } from './import-hook.js'
import { syncModuleTransforms } from './module-transforms.js'
import parseNative from './parse-native.js'
import { makePolicyGenCompartment } from './policy-gen/policy-gen-compartment.js'
import { defaultReadPowers } from './power.js'
import { devToConditions, toURLString } from './util.js'

/**
 * @import {CaptureLiteOptions} from '@endo/compartment-mapper';
 * @import {LoadCompartmentMapOptions} from './internal.js';
 * @import {ExecuteOptions} from './types.js'
 */

const { entries, fromEntries, freeze } = Object

/**
 * Common options for {@link captureFromMap} and {@link importLocation}
 *
 * @satisfies {CaptureLiteOptions | ExecuteOptions}
 */
export const DEFAULT_ENDO_OPTIONS = freeze(
  /** @type {const} */ ({
    globals: globalThis,
    importHook,
    importNowHook,
    syncModuleTransforms,
    parserForLanguage: {
      /**
       * @remarks
       * The parsers from `@endo/compartment-mapper/import-parsers.js` do not
       * precompile JS. This is intentional; if `@endo/compartment-mapper`
       * compiles the sources, we will fail to generate a LavaMoat policy
       * correctly. We must use the original sources (or distfiles).
       */
      ...defaultParserForLanguage,
      [NATIVE_PARSER_NAME]: parseNative,
    },
    languageForExtension: {
      [NATIVE_PARSER_FILE_EXT]: NATIVE_PARSER_NAME,
    },
  })
)

/**
 * Loads compartment map and associated sources.
 *
 * @param {string | URL} entrypointPath
 * @param {LoadCompartmentMapOptions} opts
 * @internal
 */
export const loadCompartmentMap = async (
  entrypointPath,
  {
    readPowers = defaultReadPowers,
    policyOverride,
    dev = false,
    ...captureOpts
  } = {}
) => {
  const entryPoint = toURLString(entrypointPath)
  const conditions = devToConditions(dev)
  const nodeCompartmentMap = await mapNodeModules(readPowers, entryPoint, {
    conditions,
    languageForExtension: {
      [NATIVE_PARSER_FILE_EXT]: NATIVE_PARSER_NAME,
    },
  })

  // we use this to inject missing imports from policy overrides into the module descriptor.
  // TODO: Endo should allow us to hook into `importHook` directly instead
  const LavaMoatCompartment = makePolicyGenCompartment(
    nodeCompartmentMap,
    policyOverride
  )

  const {
    captureCompartmentMap: compartmentMap,
    captureSources: sources,
    compartmentRenames,
  } = await captureFromMap(readPowers, nodeCompartmentMap, {
    ...captureOpts,
    ...DEFAULT_ENDO_OPTIONS,
    Compartment: LavaMoatCompartment,
  })

  /**
   * `compartmentRenames` is a mapping of _compartment name_ to _filepath_; we
   * need the reverse mapping
   *
   * @type {Record<string, string>}
   */
  const renames = fromEntries(
    entries(compartmentRenames).map(([filepath, id]) => [id, filepath])
  )

  return {
    compartmentMap,
    sources,
    renames,
  }
}
