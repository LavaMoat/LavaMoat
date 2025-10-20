/**
 * Provides {@link makeNodeCompartmentMap}, which returns a compartment map
 * descriptor generated from a `node_modules` directory.
 *
 * @packageDocumentation
 * @internal
 */

import { mapNodeModules } from '@endo/compartment-mapper/node-modules.js'
import { ATTENUATORS_COMPARTMENT } from '../constants.js'
import { log as defaultLog } from '../log.js'
import { toFileURLString } from '../util.js'
import { DEFAULT_ENDO_OPTIONS } from './options.js'
import { defaultReadPowers } from './power.js'

/**
 * @import {CanonicalName,
 *  CompartmentMapDescriptor,
 *  HookConfiguration,
 *  MapNodeModulesHooks,
 *  PackageCompartmentMapDescriptor,
 *  PackageCompartmentDescriptorName} from '@endo/compartment-mapper'
 * @import {MakeNodeCompartmentMapOptions, MakeNodeCompartmentMapResult} from '../internal.js'
 * @import {Entries, PackageJson} from 'type-fest';
 * @import {Loggerr} from 'loggerr';
 */

const DEFAULT_CONDITIONS = /** @type {const} */ (['node'])

const { entries, keys } = Object

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
    dev,
    log = defaultLog,
    endoPolicy,
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
  const unknownCanonicalNames = new Set()

  /**
   * @type {Set<CanonicalName>}
   */
  let knownCanonicalNames = new Set()

  const packageCompartmentMap = await mapNodeModules(readPowers, entrypoint, {
    conditions: new Set(DEFAULT_CONDITIONS),
    dev,
    languageForExtension: DEFAULT_ENDO_OPTIONS.languageForExtension,
    policy: endoPolicy,
    log: log.debug.bind(log),
    hooks: {
      /**
       * Stores the `package.json` for each compartment as it is created.
       *
       * At this point, the compartment does not yet have a canonical name, so
       * it will require post-processing.
       */
      packageDescriptor: ({ packageDescriptor, packageLocation }) => {
        packageJsonsByLocation.set(
          packageLocation,
          /** @type {PackageJson} */ (packageDescriptor)
        )
      },
      /**
       * Adds any missing dependencies from `policyOverride` to the list of
       * dependencies for a package
       */
      packageDependencies: ({ canonicalName, dependencies }) => {
        if (policyOverride) {
          const { resources } = policyOverride
          if (canonicalName in resources) {
            for (const dependencyCanonicalName of keys(
              resources[canonicalName].packages ?? {}
            )) {
              dependencies.add(dependencyCanonicalName)
            }
          }
        }
        return { dependencies }
      },
      /**
       * Collects unknown canonical names referenced in policy but not found in
       * the compartment map
       */
      unknownCanonicalName: ({ canonicalName }) => {
        unknownCanonicalNames.add(canonicalName)
      },
      /**
       * Collects all known canonical names from the compartment map
       */
      canonicalNames: ({ canonicalNames }) => {
        knownCanonicalNames = new Set(canonicalNames)
      },
    },
  })

  /**
   * @type {Map<CanonicalName, PackageJson>}
   */
  const packageJsonMap = createPackageJsonMap(
    packageCompartmentMap,
    packageJsonsByLocation,
    log
  )

  return {
    packageCompartmentMap,
    packageJsonMap,
    unknownCanonicalNames,
    knownCanonicalNames,
  }
}
