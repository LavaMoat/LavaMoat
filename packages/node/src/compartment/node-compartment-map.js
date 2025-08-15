/**
 * Provides {@link makeNodeCompartmentMap}, which returns a compartment map
 * descriptor generated from a `node_modules` directory.
 *
 * @packageDocumentation
 * @internal
 */

import {
  defaultCompartmentMapTransforms,
  mapNodeModules,
} from '@endo/compartment-mapper/node-modules.js'
import { hrLabel } from '../format.js'
import { log as defaultLog } from '../log.js'
import { toFileURLString } from '../util.js'
import { DEFAULT_ENDO_OPTIONS } from './options.js'
import { defaultReadPowers } from './power.js'

/**
 * @import {CompartmentMapDescriptor, CompartmentMapTransformFn} from '@endo/compartment-mapper'
 * @import {MakeNodeCompartmentMapOptions, MakeNodeCompartmentMapResult, WithInclude} from '../internal.js'
 * @import {WithLog} from '../types.js'
 */

const DEFAULT_CONDITIONS = /** @type {const} */ (['node'])

/**
 * @param {CompartmentMapTransformFn[]} compartmentMapTransforms
 * @param {WithLog & WithInclude} [options]
 * @returns {CompartmentMapTransformFn[]}
 */
const createCompartmentMapTransforms = (
  compartmentMapTransforms,
  { include = [], log = defaultLog } = {}
) => {
  let transforms = [...defaultCompartmentMapTransforms]
  for (const transform of compartmentMapTransforms) {
    if (!transforms.includes(transform)) {
      transforms.push(transform)
    }
  }
  if (include.length) {
    /** @type {CompartmentMapTransformFn} */
    const includeTransform = ({ compartmentMap, context }) => {
      for (const canonicalName of include) {
        const compartmentName = context.getCompartmentName(canonicalName)
        if (compartmentName) {
          const compartmentDescriptor =
            compartmentMap.compartments[compartmentName]
          if (compartmentDescriptor) {
            compartmentDescriptor.load = true
            // note: using our logger instead of Endo's
            log.debug(
              `Flagged compartment for loading: ${hrLabel(canonicalName)}`
            )
          }
        }
      }
      return compartmentMap
    }
    transforms.push(includeTransform)
  }

  return transforms
}

/**
 * Creates a compartment map descriptor for a given entrypoint generated from
 * its dependency graph.
 *
 * Applies transforms in `options.compartmentDescriptorTransforms` to the
 * resulting {@link CompartmentMapDescriptor}.
 *
 * The resolved value is _not_ the "final" compartment map, as it has not yet
 * been "normalized" by Endo's `captureFromMap()` or `loadFromMap()`.
 *
 * @param {string | URL} entrypointPath
 * @param {MakeNodeCompartmentMapOptions} [options]
 * @returns {Promise<MakeNodeCompartmentMapResult>}
 * @internal
 */
export const makeNodeCompartmentMap = async (
  entrypointPath,
  {
    readPowers = defaultReadPowers,
    dev,
    log = defaultLog,
    endoPolicy,
    endoPolicyOverride,
    compartmentMapTransforms = [],
    include,
  } = {}
) => {
  log.debug(
    `Graphing dependencies from ${entrypointPath} into initial compartment map…`
  )

  const conditions = new Set(DEFAULT_CONDITIONS)

  const transforms = createCompartmentMapTransforms(compartmentMapTransforms, {
    include,
    log,
  })

  const canonicalNameMap = new Map()

  const entrypoint = toFileURLString(entrypointPath)

  const nodeCompartmentMap = await mapNodeModules(readPowers, entrypoint, {
    conditions,
    dev,
    languageForExtension: DEFAULT_ENDO_OPTIONS.languageForExtension,
    policy: endoPolicy,
    policyOverride: endoPolicyOverride,
    log: log.debug.bind(log),
    canonicalNameMap,
    compartmentMapTransforms: transforms,
  })

  return {
    nodeCompartmentMap,
    canonicalNameMap,
  }
}
