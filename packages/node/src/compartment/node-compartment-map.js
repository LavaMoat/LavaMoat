/**
 * Provides {@link makeNodeCompartmentMap}, which returns a compartment map
 * descriptor generated from a `node_modules` directory.
 *
 * @packageDocumentation
 * @internal
 */

import { mapNodeModules } from '@endo/compartment-mapper/node-modules.js'
import path from 'node:path'
import { DEFAULT_TRUST_ROOT_COMPARTMENT } from '../constants.js'
import { isAbsolutePath } from '../fs.js'
import { log as defaultLog } from '../log.js'
import { toEndoURL } from '../util.js'
import { assertCompleteDataMap } from './data-map.js'
import { canonicalNameDecorator, decorateCompartmentMap } from './decorate.js'
import { DEFAULT_ENDO_OPTIONS } from './options.js'
import { defaultReadPowers } from './power.js'

/**
 * @import {CompartmentMapDescriptor, AdditionalPackageDetailsMap} from '@endo/compartment-mapper'
 * @import {PolicyHints} from 'lavamoat-core'
 * @import {MakeNodeCompartmentMapOptions, MakeNodeCompartmentMapResult} from '../internal.js'
 */

const { entries, fromEntries } = Object

const DEFAULT_CONDITIONS = /** @type {const} */ (['node'])

/**
 * Given policy hints, normalize the contents using absolute Endo-style URLs.
 *
 * @param {Object} [options] Options
 * @param {PolicyHints} [options.hints] Default is `{}`.
 * @param {string} [options.projectRoot=process.cwd()] Default is
 *   `process.cwd()`
 * @returns {Record<string, string[]>} Additional module locations
 */
const normalizeAdditionalModuleLocations = ({
  hints = {},
  projectRoot = process.cwd(),
} = {}) =>
  fromEntries(
    entries(hints).map(([fromSpecifier, moduleSpecifiers]) => {
      if (!isAbsolutePath(fromSpecifier)) {
        fromSpecifier = path.resolve(projectRoot, fromSpecifier)
      }
      const endoFromSpecifier = toEndoURL(fromSpecifier)
      const endoModuleSpecifiers = moduleSpecifiers.map((specifier) => {
        if (!isAbsolutePath(specifier)) {
          specifier = path.resolve(projectRoot, specifier)
        }
        return toEndoURL(specifier)
      })

      return [endoFromSpecifier, endoModuleSpecifiers]
    })
  )

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
    policyOverride,
    policy,
    projectRoot = process.cwd(),
    trustRoot = DEFAULT_TRUST_ROOT_COMPARTMENT,
  } = {}
) => {
  log.debug(
    `Graphing dependencies from ${entrypointPath} into initial compartment map…`
  )

  const conditions = new Set(DEFAULT_CONDITIONS)

  const entrypoint = toEndoURL(entrypointPath)

  const additionalModuleLocations = normalizeAdditionalModuleLocations({
    hints: policyOverride?.hints,
    projectRoot,
  })

  /** @type {AdditionalPackageDetailsMap} */
  const additionalPackageDetails = {}
  const nodeCompartmentMap = await mapNodeModules(readPowers, entrypoint, {
    conditions,
    dev,
    languageForExtension: DEFAULT_ENDO_OPTIONS.languageForExtension,
    policy,
    additionalModuleLocations,
    additionalPackageDetails,
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

  return { nodeCompartmentMap, nodeDataMap: dataMap, additionalPackageDetails }
}
