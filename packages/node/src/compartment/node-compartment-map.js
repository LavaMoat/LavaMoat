/**
 * Provides {@link makeNodeCompartmentMap}, which returns a compartment map
 * descriptor generated from a `node_modules` directory.
 *
 * @packageDocumentation
 * @internal
 */

import { mapNodeModules } from '@endo/compartment-mapper/node-modules.js'
import { ATTENUATORS_COMPARTMENT, ROOT_COMPARTMENT } from '../constants.js'
import { log as defaultLog } from '../log.js'
import { toFileURLString } from '../util.js'
import { DEFAULT_ENDO_OPTIONS } from './options.js'
import { defaultReadPowers } from './power.js'
import { findUnknownCanonicalNames } from '@endo/compartment-mapper/policy.js'

/**
 * @import {
 *   CompartmentMapDescriptor,
 *   MapNodeModulesOptions,
 *   PackageCompartmentDescriptorName,
 *   PackageCompartmentMapDescriptor
 * } from '@endo/compartment-mapper'
 * @import {Loggerr} from 'loggerr'
 * @import {
 *   Entries,
 *   PackageJson
 * } from 'type-fest'
 * @import {
 *   MakeNodeCompartmentMapOptions,
 *   MakeNodeCompartmentMapResult
 * } from '../internal.js'
 * @import {CanonicalName} from '../types.js'
 */

const DEFAULT_CONDITIONS = /** @type {const} */ (['node'])

const { entries } = Object

/**
 * Creates a map of canonical names to their corresponding `package.json`
 * contents for use later.
 *
 * @param {PackageCompartmentMapDescriptor} packageCompartmentMap
 * @param {Map<PackageCompartmentDescriptorName, PackageJson>} packageJsonsByLocation
 * @param {Loggerr} log
 * @returns {Map<CanonicalName, PackageJson>}
 */
const createPackageJsonMap = (
  packageCompartmentMap,
  packageJsonsByLocation,
  log
) => {
  /** @type {Map<CanonicalName, PackageJson>} */
  const packageJsonMap = new Map()

  const compartmentEntries =
    /** @type {Entries<typeof packageCompartmentMap.compartments>} */ (
      entries(packageCompartmentMap.compartments)
    )

  for (const [compartmentName, compartmentDescriptor] of compartmentEntries) {
    const { label: canonicalName, name } = compartmentDescriptor
    if (name === ATTENUATORS_COMPARTMENT) {
      continue
    }
    const packageJson = packageJsonsByLocation.get(compartmentName)
    if (packageJson) {
      packageJsonMap.set(canonicalName, packageJson)
    } else {
      log.warning(
        `No package.json found for compartment descriptor "${canonicalName}" at ${compartmentName}"`
      )
    }
  }
  return packageJsonMap
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
    prodOnly,
    log = defaultLog,
    endoPolicy,
    trustRoot,
    mapNodeModulesOptions = {},
    policyOverride,
  } = {}
) => {
  log.debug(
    `Graphing dependencies from ${entrypointPath} into initial compartment map…`
  )

  const entrypoint = toFileURLString(entrypointPath)

  /**
   * @type {Map<PackageCompartmentDescriptorName, PackageJson>}
   */
  const packageJsonsByLocation = new Map()

  /**
   * @type {Set<CanonicalName>}
   */
  let unknownCanonicalNames = new Set()

  /**
   * @type {Set<CanonicalName>}
   */
  const knownCanonicalNames = new Set()

  /**
   * Deferred warnings
   *
   * @type {string[]}
   */
  const warnings = []

  /** @type {CanonicalName | undefined} */
  let rootUsePolicy

  /**
   * Order matters: consumer-provided options come first so the controlled
   * fields below take precedence. The {@link ConsumerMapNodeModulesOptions} type
   * already excludes the controlled keys, but spreading them last is
   * belt-and-braces against the runtime case where the type is bypassed.
   *
   * @type {MapNodeModulesOptions}
   */
  const mergedMapNodeModulesOptions = {
    ...mapNodeModulesOptions,
    conditions: new Set(DEFAULT_CONDITIONS),
    dev: !prodOnly,
    languageForExtension: DEFAULT_ENDO_OPTIONS.languageForExtension,
    policy: endoPolicy,
    log: log.debug.bind(log),
    /**
     * Stores the `package.json` for each compartment as it is created.
     *
     * At this point, the compartment does not yet have a canonical name, so it
     * will require post-processing.
     */
    packageDataHook: ({ packageData }) => {
      for (const [
        label,
        { packageDescriptor, location, canonicalName, name },
      ] of packageData.entries()) {
        if (!trustRoot && label === ROOT_COMPARTMENT) {
          rootUsePolicy = name
        }
        knownCanonicalNames.add(canonicalName)
        packageJsonsByLocation.set(
          location,
          /** @type {PackageJson} */ (packageDescriptor)
        )
      }
    },
  }

  // The unknownCanonicalNameHook will only be called if we provided mapNodeModules with a policy.
  if (endoPolicy) {
    /**
     * Collects unknown canonical names referenced in policy but not found in
     * the compartment map
     */
    mergedMapNodeModulesOptions.unknownCanonicalNameHook = ({
      canonicalName,
    }) => {
      unknownCanonicalNames.add(canonicalName)
    }
  }

  const packageCompartmentMap = await mapNodeModules(
    readPowers,
    entrypoint,
    mergedMapNodeModulesOptions
  )

  /**
   * @type {Map<CanonicalName, PackageJson>}
   */
  const packageJsonMap = createPackageJsonMap(
    packageCompartmentMap,
    packageJsonsByLocation,
    log
  )

  // if we have no policy but we do have policy overrides (policy generation
  // use-case), we must gather the unknown canonical names after-the-fact using
  // the overrides
  if (policyOverride && !endoPolicy) {
    unknownCanonicalNames = findUnknownCanonicalNames(
      knownCanonicalNames,
      policyOverride
    )
  }

  return {
    packageCompartmentMap,
    packageJsonMap,
    unknownCanonicalNames,
    knownCanonicalNames,
    rootUsePolicy,
    warnings,
  }
}
