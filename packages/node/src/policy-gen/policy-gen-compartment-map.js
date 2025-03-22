/**
 * Provides {@link loadCompartmentMap}, which returns a compartment map
 * descriptor for a given entrypoint.
 */

import { captureFromMap } from '@endo/compartment-mapper/capture-lite.js'
import { mapNodeModules } from '@endo/compartment-mapper/node-modules.js'
import { nullImportHook } from '../compartment/import-hook.js'
import { DEFAULT_ENDO_OPTIONS } from '../compartment/options.js'
import { defaultReadPowers } from '../compartment/power.js'
import { ATTENUATORS_COMPARTMENT } from '../constants.js'
import { GenerationError } from '../error.js'
import { toEndoURL } from '../util.js'
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
    trustRoot,
    log,
    ...captureOpts
  } = {}
) => {
  const entryPoint = toEndoURL(entrypointPath)
  const nodeCompartmentMap = await mapNodeModules(readPowers, entryPoint, {
    conditions,
    languageForExtension: DEFAULT_ENDO_OPTIONS.languageForExtension,
  })

  /**
   * Replace the `label` field with the canonical name
   *
   * In lavamoat, the canonical name is what we present to the end user as a
   * resource key in policy. We have no use for Endo's label field, so we
   * replace labels with canonicalNames derived from path.
   */
  values(nodeCompartmentMap.compartments).forEach((compartmentDescriptor) => {
    if (compartmentDescriptor.name === ATTENUATORS_COMPARTMENT) {
      throw new GenerationError(
        `Unexpected attenuator compartment found when computing canonical package name in ${compartmentDescriptor.label} (${compartmentDescriptor.location})`
      )
    }
    compartmentDescriptor.label = getCanonicalName(
      compartmentDescriptor,
      trustRoot
    )
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
    newToOldCompartmentNames: renames,
  } = await captureFromMap(readPowers, nodeCompartmentMap, {
    ...DEFAULT_ENDO_OPTIONS,
    importHook: nullImportHook,
    Compartment: LavaMoatCompartment,
    ...captureOpts,
  })

  return {
    compartmentMap,
    sources,
    renames,
  }
}
