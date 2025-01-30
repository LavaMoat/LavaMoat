import { captureFromMap } from '@endo/compartment-mapper/capture-lite.js'
import { mapNodeModules } from '@endo/compartment-mapper/node-modules.js'
import { DEFAULT_ENDO_OPTIONS } from '../compartment/options.js'
import { defaultReadPowers } from '../compartment/power.js'
import { NATIVE_PARSER_FILE_EXT, NATIVE_PARSER_NAME } from '../constants.js'
import { toURLString } from '../util.js'
import { makePolicyGenCompartment } from './policy-gen-compartment-class.js'

/**
 * @import {LoadCompartmentMapOptions} from '../internal.js';
 */

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
      '': 'cjs',
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
    compartmentRenames: renames,
  } = await captureFromMap(readPowers, nodeCompartmentMap, {
    ...captureOpts,
    ...DEFAULT_ENDO_OPTIONS,
    Compartment: LavaMoatCompartment,
  })

  return {
    compartmentMap,
    sources,
    renames,
  }
}
