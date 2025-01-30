/**
 * Provides {@link loadCompartmentMap}, which returns a compartment map
 * descriptor for a given entrypoint.
 */

import { captureFromMap } from '@endo/compartment-mapper/capture-lite.js'
import { mapNodeModules } from '@endo/compartment-mapper/node-modules.js'
import { DEFAULT_ENDO_OPTIONS } from '../compartment/options.js'
import { defaultReadPowers } from '../compartment/power.js'
import { NATIVE_PARSER_FILE_EXT, NATIVE_PARSER_NAME } from '../constants.js'
import { toURLString } from '../util.js'
import { makePolicyGenCompartment } from './policy-gen-compartment-class.js'
import { getCanonicalName } from './policy-gen-util.js'

/**
 * @import {LoadCompartmentMapOptions} from '../internal.js'
 * @import {CompartmentMapDescriptor, Sources} from '@endo/compartment-mapper'
 */

const { values } = Object

/**
 * Loads compartment map and associated sources.
 *
 * This is _only_ for policy gen.
 *
 * @param {string | URL} entrypointPath
 * @param {LoadCompartmentMapOptions} opts
 * @returns {Promise<{
 *   compartmentMap: CompartmentMapDescriptor
 *   sources: Sources
 *   renames: Record<string, string>
 * }>}
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

  /**
   * Replace the `label` field with the canonical name
   *
   * In lavamoat, the canonical name is what we present to the end user as a
   * resource key in policy. We have no use for Endo's label field, so we
   * replace labels with canonicalNames derived from path.
   */
  values(nodeCompartmentMap.compartments).map((compartmentDescriptor) => {
    compartmentDescriptor.label = getCanonicalName(compartmentDescriptor)
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
