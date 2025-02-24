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

  // In lavamoat the canonical name is what we present to the end user as a resource key in policy. We have no use for Endo's label field, so we replace labels with canonicalNames derived from path.
  // NOTE: the algorithm creating paths happens to be identical to the one in @lavamoat/aa package. Not that it matters because policies cannot be reused between this and other lavamoat tools.
  Object.values(nodeCompartmentMap.compartments).map(
    (compartmentDescriptor) => {
      if (!compartmentDescriptor.path) {
        // this should never happen and is not recoverable
        throw new Error(
          `compartmentDescriptor.path is not defined for the compartment ${compartmentDescriptor.name} ${compartmentDescriptor.location}`
        )
      }
      if (compartmentDescriptor.path.length === 0) {
        compartmentDescriptor.label = '$root$'
      } else {
        compartmentDescriptor.label = compartmentDescriptor.path.join('>')
      }
    }
  )

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
