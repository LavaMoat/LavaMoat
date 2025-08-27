/**
 * Provides {@link loadCompartmentMapForPolicy}, which returns a compartment map
 * descriptor for a given entrypoint.
 *
 * @packageDocumentation
 * @internal
 */

import { captureFromMap } from '@endo/compartment-mapper/capture-lite.js'

import { nullImportHook } from '../compartment/import-hook.js'
import { makeNodeCompartmentMap } from '../compartment/node-compartment-map.js'
import { DEFAULT_ENDO_OPTIONS } from '../compartment/options.js'
import { defaultReadPowers } from '../compartment/power.js'
import {
  ATTENUATORS_COMPARTMENT,
  DEFAULT_TRUST_ROOT_COMPARTMENT,
} from '../constants.js'
import { GenerationError } from '../error.js'
import { readJsonFile } from '../fs.js'
import { log as defaultLog } from '../log.js'
import { toEndoPolicy } from '../policy-converter.js'
import { mergePolicies } from '../policy-util.js'
import { isError } from '../util.js'

/**
 * @import {LavaMoatEndoPolicy} from '../types.js'
 * @import {LoadCompartmentMapForPolicyOptions, LoadCompartmentMapResult} from '../internal.js'
 * @import {Loggerr} from 'loggerr';
 * @import {CaptureLiteOptions, PackageCompartmentMapDescriptor} from '@endo/compartment-mapper'
 * @import {PackageJson} from 'type-fest'
 */

const { values } = Object

/**
 * @param {PackageCompartmentMapDescriptor} compartmentMap
 * @param {Loggerr} [log]
 * @returns {Promise<Map<string, PackageJson>>}
 */
const readAllPackageJsons = async (compartmentMap, log = defaultLog) => {
  const entries = await Promise.all(
    values(compartmentMap.compartments)
      .filter(({ label }) => label !== ATTENUATORS_COMPARTMENT)
      .map(({ label, location }) =>
        readJsonFile(new URL('./package.json', location)).then(
          (packageJson) => {
            log.debug(`Read package.json for "${label}" successfully`)
            return /** @type {[canonicalName: string, packageJson: PackageJson]} */ ([
              label,
              packageJson,
            ])
          }
        )
      )
  )
  return new Map(entries)
}

/**
 * Loads compartment map and associated sources.
 *
 * This is _only_ for policy gen.
 *
 * @param {string | URL} entrypointPath
 * @param {LoadCompartmentMapForPolicyOptions} options
 * @returns {Promise<LoadCompartmentMapResult>}
 * @internal
 */
export const loadCompartmentMapForPolicy = async (
  entrypointPath,
  {
    dev,
    log = defaultLog,
    policyOverride,
    readPowers = defaultReadPowers,
    trustRoot = DEFAULT_TRUST_ROOT_COMPARTMENT,
    ...captureOpts
  } = {}
) => {
  /** @type {PackageCompartmentMapDescriptor} */
  let nodeCompartmentMap

  /** @type {LavaMoatEndoPolicy | undefined} */
  let endoPolicyOverride

  await Promise.resolve()

  if (policyOverride) {
    endoPolicyOverride = await toEndoPolicy(mergePolicies(policyOverride), {
      log,
    })
  }

  /** @type {Map<string, string>} */
  let compartmentNameToCanonicalNameMap
  try {
    ;({
      canonicalNameMap: compartmentNameToCanonicalNameMap,
      nodeCompartmentMap,
    } =
      // eslint-disable-next-line @jessie.js/safe-await-separator
      await makeNodeCompartmentMap(entrypointPath, {
        dev,
        endoPolicyOverride,
        log,
        readPowers,
        trustRoot,
      }))
  } catch (err) {
    if (isError(err)) {
      throw new GenerationError(
        `Failed to create compartment map for policy generation: ${err.stack}`,
        { cause: err }
      )
    }
    throw new GenerationError(
      `Failed to create compartment map for policy generation: ${err}`,
      { cause: err }
    )
  }

  if (
    !compartmentNameToCanonicalNameMap.has(nodeCompartmentMap.entry.compartment)
  ) {
    compartmentNameToCanonicalNameMap.set(
      nodeCompartmentMap.entry.compartment,
      nodeCompartmentMap.compartments[nodeCompartmentMap.entry.compartment].name
    )
  }

  const packageJsonMap = await readAllPackageJsons(nodeCompartmentMap, log)

  /** @type {CaptureLiteOptions} */
  const captureLiteOptions = {
    ...DEFAULT_ENDO_OPTIONS,
    forceLoad: policyOverride?.include,
    importHook: nullImportHook,
    log: log.debug.bind(log),
    ...captureOpts,
  }

  // captureFromMap finalizes the compartment map descriptor, but does not provide for execution."file:///Users/boneskull/projects/lavamoat/lavamoat/node_modules/@babel/plugin-transform-object-super/"
  try {
    const {
      captureCompartmentMap: compartmentMap,
      captureSources: sources,
      newToOldCompartmentNames: renames,
    } = await captureFromMap(readPowers, nodeCompartmentMap, captureLiteOptions)

    return {
      compartmentMap,
      packageJsonMap,
      renames,
      sources,
    }
  } catch (err) {
    if (isError(err)) {
      throw new GenerationError(
        `Failed to capture compartment map for policy generation: ${err.stack}`,
        { cause: err }
      )
    }
    throw new GenerationError(
      `Failed to capture compartment map for policy generation: ${err}`,
      { cause: err }
    )
  }
}
