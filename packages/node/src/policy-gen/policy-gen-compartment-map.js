import { DEFAULT_ENDO_OPTIONS } from '#compartment/options'
import { defaultReadPowers } from '#compartment/power'
import { NATIVE_PARSER_FILE_EXT, NATIVE_PARSER_NAME } from '#constants'
import { toURLString } from '#util'
import { captureFromMap } from '@endo/compartment-mapper/capture-lite.js'
import { mapNodeModules } from '@endo/compartment-mapper/node-modules.js'
import { makePolicyGenCompartment } from './policy-gen-compartment-class.js'

/**
 * @import {LoadCompartmentMapOptions} from '#internal';
 */

const { entries, fromEntries } = Object

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
    conditions,
    ...captureOpts
  } = {}
) => {
  const entryPoint = toURLString(entrypointPath)
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
