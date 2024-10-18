import { importLocation } from '@endo/compartment-mapper'
import { captureFromMap } from '@endo/compartment-mapper/capture-lite.js'
import { defaultParserForLanguage } from '@endo/compartment-mapper/import-parsers.js'
import { mapNodeModules } from '@endo/compartment-mapper/node-modules.js'
import {
  DEFAULT_ATTENUATOR,
  NATIVE_FILE_EXT,
  NATIVE_PARSER_NAME,
} from './constants.js'
import { makeGlobalsAttenuator } from './default-attenuator.js'
import { importHook, importNowHook } from './import-hook.js'
import { syncModuleTransforms } from './module-transforms.js'
import parseNative from './parse-native.js'
import { toEndoPolicy } from './policy-converter.js'
import { makeGreedyCompartment } from './policy-gen/greedy-compartment.js'
import { defaultReadPowers } from './power.js'
import { toURLString } from './util.js'

/**
 * @import {ReadNowPowers, CaptureOptions} from '@endo/compartment-mapper';
 * @import {LavaMoatPolicy} from 'lavamoat-core';
 * @import {LoadCompartmentMapOptions} from './types.js';
 */

const { entries, fromEntries, freeze } = Object

/**
 * Common options for {@link captureFromMap}
 *
 * @satisfies {CaptureOptions}
 */
const ENDO_OPTIONS = freeze(
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
 * @param {LoadCompartmentMapOptions} opts
 * @internal
 */

export const loadCompartmentMap = async (
  entrypointPath,
  { readPowers = defaultReadPowers, policyOverride, ...captureOpts } = {}
) => {
  const entryPoint = toURLString(entrypointPath)

  const nodeCompartmentMap = await mapNodeModules(readPowers, entryPoint, {
    dev: true,
  })

  const GreedyCompartment = makeGreedyCompartment(
    nodeCompartmentMap,
    policyOverride
  )

  const {
    captureCompartmentMap: compartmentMap,
    captureSources: sources,
    compartmentRenames,
  } = await captureFromMap(readPowers, nodeCompartmentMap, {
    ...captureOpts,
    ...ENDO_OPTIONS,
    Compartment: GreedyCompartment,
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
 * @param {ReadNowPowers} readPowers
 * @param {string | URL} entrypointPath
 * @param {LavaMoatPolicy} policy
 * @returns {Promise<T>}
 * @internal
 */
export const execute = async (readPowers, entrypointPath, policy) => {
  const endoPolicy = await toEndoPolicy(policy)
  const entryPoint = toURLString(entrypointPath)
  const { namespace } = await importLocation(readPowers, entryPoint, {
    ...ENDO_OPTIONS,
    modules: {
      [DEFAULT_ATTENUATOR]: {
        attenuateGlobals: makeGlobalsAttenuator({ policy }),
      },
    },
    policy: endoPolicy,
  })
  return namespace
}
