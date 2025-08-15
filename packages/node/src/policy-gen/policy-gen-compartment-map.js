/**
 * Provides {@link loadCompartmentMapForPolicy}, which returns a compartment map
 * descriptor for a given entrypoint.
 *
 * @packageDocumentation
 * @internal
 */

import { captureFromMap } from '@endo/compartment-mapper/capture-lite.js'
import { createSpinner, defaultLog } from '@lavamoat/vog'
import { nullImportHook } from '../compartment/import-hook.js'
import { makeNodeCompartmentMap } from '../compartment/node-compartment-map.js'
import { DEFAULT_ENDO_OPTIONS } from '../compartment/options.js'
import { defaultReadPowers } from '../compartment/power.js'
import { DEFAULT_TRUST_ROOT_COMPARTMENT } from '../constants.js'
import { GenerationError } from '../error.js'
import { makePolicyGenCompartment } from './policy-gen-compartment-class.js'

/**
 * @import {LavaMoatEndoPolicy} from '../types.js'
 * @import {LoadCompartmentMapForPolicyOptions, LoadCompartmentMapResult} from '../internal.js'
 * @import {CaptureLiteOptions, CompartmentMapDescriptor, Sources} from '@endo/compartment-mapper'
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
    readPowers = defaultReadPowers,
    policyOverride,
    trustRoot = DEFAULT_TRUST_ROOT_COMPARTMENT,
    log = defaultLog,
    dev,
    ...captureOpts
  } = {}
) => {
  /** @type {CompartmentMapDescriptor} */
  let nodeCompartmentMap
  /** @type {CompleteCompartmentDescriptorDataMap} */
  let nodeDataMap
  const spinner = createSpinner('Graphing node_modules…').start()
  try {
    ;({
      nodeCompartmentMap,
      canonicalNameMap: compartmentNameToCanonicalNameMap,
    } =
      // eslint-disable-next-line @jessie.js/safe-await-separator
      await makeNodeCompartmentMap(entrypointPath, {
        readPowers,
        dev,
        log,
        trustRoot,
        endoPolicyOverride,
        include: policyOverride?.include,
      }))
    spinner.succeed('Graphing node_modules complete')
  } catch (err) {
    spinner.fail('Graphing node_modules failed')
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
    { policyOverride, log }
  )

  /** @type {CaptureLiteOptions} */
  const captureLiteOptions = {
    ...DEFAULT_ENDO_OPTIONS,
    importHook: nullImportHook,
    Compartment: PolicyGenCompartment,
    log: log.debug.bind(log),
    ...captureOpts,
  }

  spinner.start('Optimizing compartment map…')

  /** @type {CompartmentMapDescriptor} */
  let compartmentMap
  /** @type {Sources} */
  let sources
  /** @type {Record<string, string>} */
  let renames
  /** @type {Record<string, string>} */
  let dataMapRenames
  // captureFromMap finalizes the compartment map descriptor, but does not provide for execution.
  try {
    ;({
      captureCompartmentMap: compartmentMap,
      captureSources: sources,
      // TODO: this could be more narrowly typed (though not super-straightforward)
      newToOldCompartmentNames: renames,
      // TODO: this too (see type assertion below)
      oldToNewCompartmentNames: dataMapRenames,
    } = await captureFromMap(
      readPowers,
      nodeCompartmentMap,
      captureLiteOptions
    ))
    spinner.succeed('Optimizing compartment map complete')
  } catch (err) {
    spinner.fail('Optimizing compartment map failed')
    throw new GenerationError(
      `Failed to optimize compartment map for policy generation`,
      { cause: err }
    )
  }

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
    compartmentMap,
    sources,
    packageJsonMap,
    renames,
    canonicalNameMap,
  }
}
