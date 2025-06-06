/**
 * Provides {@link makeNodeCompartmentMap}, which returns a compartment map
 * descriptor generated from a `node_modules` directory.
 *
 * @packageDocumentation
 * @internal
 */

import { mapNodeModules } from '@endo/compartment-mapper/node-modules.js'
import { defaultLog } from '@lavamoat/vog'
import { DEFAULT_TRUST_ROOT_COMPARTMENT } from '../constants.js'
import { toEndoURL } from '../util.js'
import { assertCompleteDataMap } from './data-map.js'
import { canonicalNameDecorator, decorateCompartmentMap } from './decorate.js'
import { DEFAULT_ENDO_OPTIONS } from './options.js'
import { defaultReadPowers } from './power.js'

/**
 * @import {CompartmentMapDescriptor} from '@endo/compartment-mapper'
 * @import {MakeNodeCompartmentMapOptions, MakeNodeCompartmentMapResult} from '../internal.js'
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
    decorators = [],
    log = defaultLog,
    policy,
    trustRoot = DEFAULT_TRUST_ROOT_COMPARTMENT,
  } = {}
) => {
  log.debug(
    `Graphing dependencies from ${entrypointPath} into initial compartment map…`
  )

  const conditions = new Set(DEFAULT_CONDITIONS)

  const entrypoint = toEndoURL(entrypointPath)

  const nodeCompartmentMap = await mapNodeModules(readPowers, entrypoint, {
    conditions,
    dev,
    languageForExtension: DEFAULT_ENDO_OPTIONS.languageForExtension,
    policy,
    log: log.debug.bind(log),
  })

  decorators = decorators.includes(canonicalNameDecorator)
    ? decorators
    : [canonicalNameDecorator, ...decorators]

  const dataMap = decorateCompartmentMap(nodeCompartmentMap, decorators, {
    trustRoot,
    log,
  })

  assertCompleteDataMap(nodeCompartmentMap, dataMap)

  return { nodeCompartmentMap, nodeDataMap: dataMap }
}
