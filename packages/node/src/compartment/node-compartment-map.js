/**
 * Provides {@link makeNodeCompartmentMap}, which returns a compartment map
 * descriptor generated from a `node_modules` directory.
 *
 * @packageDocumentation
 * @internal
 */

import { mapNodeModules } from '@endo/compartment-mapper/node-modules.js'
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
    compartmentMapTransforms,
  } = {}
) => {
  log.debug(
    `Graphing dependencies from ${entrypointPath} into initial compartment map…`
  )

  const conditions = new Set(DEFAULT_CONDITIONS)

  const canonicalNameMap = new Map()

  const entrypoint = toFileURLString(entrypointPath)

  const nodeCompartmentMap = await mapNodeModules(readPowers, entrypoint, {
    conditions,
    dev,
    languageForExtension: DEFAULT_ENDO_OPTIONS.languageForExtension,
    policy: endoPolicy,
    policyOverride: endoPolicyOverride,
    log: log.debug.bind(log),
    compartmentMapTransforms,
  })

  return {
    nodeCompartmentMap,
    canonicalNameMap,
  }
}
