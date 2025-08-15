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
import { DEFAULT_TRUST_ROOT_COMPARTMENT } from '../constants.js'
import { GenerationError } from '../error.js'
import { log as defaultLog } from '../log.js'
import { toEndoPolicy } from '../policy-converter.js'
import { mergePolicies } from '../policy-util.js'
import { makePolicyGenCompartment } from './policy-gen-compartment-class.js'

/**
 * @import {LavaMoatEndoPolicy} from '../types.js'
 * @import {LoadCompartmentMapForPolicyOptions, LoadCompartmentMapResult} from '../internal.js'
 * @import {CaptureLiteOptions, CompartmentMapDescriptor} from '@endo/compartment-mapper'
 * @import {PackageJson} from 'type-fest'
 */

const { entries } = Object

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
  /** @type {CompartmentMapDescriptor} */
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
        include: policyOverride?.include,
        log,
        readPowers,
        trustRoot,
      }))
  } catch (err) {
    throw new GenerationError(
      `Failed to create compartment map for policy generation: ${err.stack}`,
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

  // we use this to inject missing imports from policy overrides into the module descriptor.
  // TODO: Endo should allow us to hook into `importHook` directly instead
  const PolicyGenCompartment = makePolicyGenCompartment(
    nodeCompartmentMap,
    compartmentNameToCanonicalNameMap,
    { log, policyOverride }
  )

  /** @type {CaptureLiteOptions} */
  const captureLiteOptions = {
    ...DEFAULT_ENDO_OPTIONS,
    Compartment: PolicyGenCompartment,
    importHook: nullImportHook,
    log: log.debug.bind(log),
    ...captureOpts,
  }

  // captureFromMap finalizes the compartment map descriptor, but does not provide for execution."file:///Users/boneskull/projects/lavamoat/lavamoat/node_modules/@babel/plugin-transform-object-super/"
  const {
    captureCompartmentMap: compartmentMap,
    captureSources: sources,
    newToOldCompartmentNames: renames,
    oldToNewCompartmentNames,
  } = await captureFromMap(readPowers, nodeCompartmentMap, captureLiteOptions)

  const canonicalNameMap = new Map(
    [...compartmentNameToCanonicalNameMap].map(([location, canonicalName]) => [
      oldToNewCompartmentNames[location],
      canonicalName,
    ])
  )

  const packageJsonMap = /** @type {Map<string, PackageJson>} */ (
    new Map(
      entries(nodeCompartmentMap.compartments).map(
        ([location, compartmentDescriptor]) => [
          oldToNewCompartmentNames[location],
          compartmentDescriptor.packageDescriptor,
        ]
      )
    )
  )

  return {
    canonicalNameMap,
    compartmentMap,
    packageJsonMap,
    renames,
    sources,
  }
}
