import { importLocation } from '@endo/compartment-mapper'
import { captureFromMap } from '@endo/compartment-mapper/capture-lite.js'
import { defaultParserForLanguage } from '@endo/compartment-mapper/import-parsers.js'
import { mapNodeModules } from '@endo/compartment-mapper/node-modules.js'
import { NATIVE_FILE_EXT, NATIVE_PARSER_NAME } from './constants.js'
import { importHook, importNowHook } from './import-hook.js'
import { syncModuleTransforms } from './module-transforms.js'
import parseNative from './parse-native.js'
import { toEndoPolicy } from './policy-converter.js'
import { defaultReadPowers } from './power.js'
import { toURLString } from './util.js'

const { entries, fromEntries, freeze } = Object

/**
 * Common options for calling functions in `@endo/compartment-mapper`
 */
export const ENDO_OPTIONS = freeze(
  /** @type {const} */ ({
    globals: globalThis,
    importHook,
    importNowHook,
    syncModuleTransforms,
    parserForLanguage: {
      /**
       * @remarks
       * The parsers from `@endo/compartment-mapper/import-parsers.js` do not
       * precompile JS; this is necessary for `lavamoat-core` to parse sources
       * correctly when generating a policy.
       */
      ...defaultParserForLanguage,
      [NATIVE_PARSER_NAME]: parseNative,
    },
    languageForExtension: {
      [NATIVE_FILE_EXT]: NATIVE_PARSER_NAME,
    },
    dev: true,
  })
)

/**
 * Loads compartment map and associated sources.
 *
 * @param {string | URL} entrypointPath
 * @param {import('./policy-gen/types.js').LoadCompartmentMapOptions} opts
 * @internal
 */

export async function loadCompartmentMap(
  entrypointPath,
  { readPowers = defaultReadPowers, ...captureOpts } = {}
) {
  const entryPoint = toURLString(entrypointPath)

  const nodeCompartmentMap = await mapNodeModules(readPowers, entryPoint, {
    dev: true,
  })

  const {
    captureCompartmentMap: compartmentMap,
    captureSources: sources,
    compartmentRenames,
  } = await captureFromMap(readPowers, nodeCompartmentMap, {
    ...captureOpts,
    ...ENDO_OPTIONS,
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

/**
 * Wrapper around `importLocation` which first converts a LavaMoat policy to an
 * Endo policy
 *
 * @template [T=unknown] Default is `unknown`
 * @param {import('@endo/compartment-mapper').ReadPowers} readPowers
 * @param {string | URL} entrypointPath
 * @param {import('lavamoat-core').LavaMoatPolicy} policy
 * @returns {Promise<T>}
 * @internal
 */
export async function execute(readPowers, entrypointPath, policy) {
  const endoPolicy = await toEndoPolicy(policy)
  const entryPoint = toURLString(entrypointPath)
  const { namespace } = await importLocation(readPowers, entryPoint, {
    ...ENDO_OPTIONS,
    policy: endoPolicy,
  })
  return namespace
}
