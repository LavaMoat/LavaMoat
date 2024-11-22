import { captureFromMap } from '@endo/compartment-mapper/capture-lite.js'
import { defaultParserForLanguage } from '@endo/compartment-mapper/import-parsers.js'
import { importLocation } from '@endo/compartment-mapper/import.js'
import { mapNodeModules } from '@endo/compartment-mapper/node-modules.js'
import {
  DEFAULT_ATTENUATOR,
  NATIVE_PARSER_FILE_EXT,
  NATIVE_PARSER_NAME,
} from './constants.js'
import { attenuateModule, makeGlobalsAttenuator } from './default-attenuator.js'
import { makeExecutionCompartment } from './execution-compartment.js'
import { importHook, importNowHook } from './import-hook.js'
import { syncModuleTransforms } from './module-transforms.js'
import parseNative from './parse-native.js'
import { toEndoPolicy } from './policy-converter.js'
import { makePolicyGenCompartment } from './policy-gen/policy-gen-compartment.js'
import { defaultReadPowers } from './power.js'
import { toURLString } from './util.js'

/**
 * @import {ReadNowPowers, CaptureLiteOptions} from '@endo/compartment-mapper';
 * @import {LavaMoatPolicy} from 'lavamoat-core';
 * @import {LoadCompartmentMapOptions} from './types.js';
 */

const { entries, fromEntries, freeze } = Object

/**
 * Common options for {@link captureFromMap}
 *
 * @satisfies {CaptureLiteOptions}
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
 * Converts a boolean `dev` to a set of conditions
 *
 * @param {boolean} [dev]
 * @returns {Set<string>}
 */
const devToConditions = (dev) => (dev ? new Set(['development']) : new Set())

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
    ...ENDO_OPTIONS,
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

/**
 * Wrapper around {@link importLocation} which first converts a LavaMoat policy
 * to an Endo policy.
 *
 * @template [T=unknown] Default is `unknown`
 * @param {ReadNowPowers} readPowers
 * @param {string | URL} entrypointPath
 * @param {LavaMoatPolicy} policy
 * @param {{ dev?: boolean }} [options]
 * @returns {Promise<T>} Contents of imported module
 * @internal
 */
export const execute = async (
  readPowers,
  entrypointPath,
  policy,
  { dev = false } = {}
) => {
  const endoPolicy = await toEndoPolicy(policy)
  const entryPoint = toURLString(entrypointPath)
  const conditions = devToConditions(dev)
  const { namespace } = await importLocation(readPowers, entryPoint, {
    ...ENDO_OPTIONS,
    Compartment: makeExecutionCompartment(globalThis),
    modules: {
      [DEFAULT_ATTENUATOR]: {
        attenuateGlobals: makeGlobalsAttenuator({ policy }),
        attenuateModule,
      },
    },
    policy: endoPolicy,
    conditions,
  })
  return namespace
}
