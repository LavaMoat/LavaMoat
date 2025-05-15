/**
 * Provides {@link loadCompartmentMapForPolicy}, which returns a compartment map
 * descriptor for a given entrypoint.
 *
 * @packageDocumentation
 * @internal
 */

import { captureFromMap } from '@endo/compartment-mapper/capture-lite.js'
import { assertCompleteDataMap } from '../compartment/data-map.js'
import { nullImportHook } from '../compartment/import-hook.js'
import { makeNodeCompartmentMap } from '../compartment/node-compartment-map.js'
import { DEFAULT_ENDO_OPTIONS } from '../compartment/options.js'
import { defaultReadPowers } from '../compartment/power.js'
import { DEFAULT_TRUST_ROOT_COMPARTMENT } from '../constants.js'
import { GenerationError } from '../error.js'
import { log as defaultLog } from '../log.js'
import { noop } from '../util.js'
import { makePolicyGenCompartment } from './policy-gen-compartment-class.js'

/**
 * @import {CompartmentDescriptorData, CompartmentDescriptorDataMap} from '../types.js'
 * @import {LoadCompartmentMapForPolicyOptions, LoadCompartmentMapResult} from '../internal.js'
 * @import {CaptureLiteOptions} from '@endo/compartment-mapper'
 */

const { entries } = Object

/**
 * Remaps compartment descriptor metadata from old names (paths) to new names
 * (based on package name & version)
 *
 * @template {CompartmentDescriptorDataMap<string, CompartmentDescriptorData>} T
 * @param {T} dataMap
 * @param {Record<keyof T, string>} oldToNewCompartmentNames
 * @returns {CompartmentDescriptorDataMap<string, CompartmentDescriptorData>}
 * @internal
 */
const remapDataMap = (dataMap, oldToNewCompartmentNames) => {
  /** @type {CompartmentDescriptorDataMap<string, CompartmentDescriptorData>} */
  const newDataMap = new Map()

  for (const [oldName, newName] of entries(oldToNewCompartmentNames)) {
    const data = dataMap.get(oldName)
    if (!data) {
      throw new ReferenceError(`Missing data for compartment at ${oldName}`)
    }
    if (!data.canonicalName) {
      throw new TypeError(`Missing canonicalName for compartment at ${oldName}`)
    }
    newDataMap.set(newName, data)
  }

  return newDataMap
}

/**
 * This compartment descriptor transform replaces the `label` field of the
 * compartment descriptor with the canonical name of the package.
 *
 * We have no use for Endo's own `label` field, which is only used for debugging
 * and/or display purposes.
 *
 * It is intended to be executed _last_ in the list of transforms.
 *
 * @privateRemarks
 * It may become necessary to keep a mapping from old to new labels in the
 * future. Why? Because stuff like that keeps being necessary.
 *
 * We may want to consider adding an option to `mapNodeModules()` which is a
 * callback to generate the `label` field.
 * @type {CompartmentDescriptorTransform}
 */
const finalCompartmentDescriptorTransform = (
  compartmentDescriptor,
  { trustRoot = true, log = defaultLog } = {}
) => {
  /* c8 ignore next */
  if (compartmentDescriptor.name === ATTENUATORS_COMPARTMENT) {
    // should be impossible
    throw new GenerationError(
      `Unexpected attenuator compartment found when computing canonical package name in ${compartmentDescriptor.label} (${compartmentDescriptor.location})`
    )
  }

  const { label } = compartmentDescriptor
  compartmentDescriptor.label = getCanonicalName(
    compartmentDescriptor,
    trustRoot
  )

  log.debug(
    `Replaced compartment label ${hrLabel(label)} with canonical name ${hrLabel(compartmentDescriptor.label)}`
  )
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
    readPowers = defaultReadPowers,
    policyOverride,
    trustRoot = DEFAULT_TRUST_ROOT_COMPARTMENT,
    log = defaultLog,
    decorators = [],
    dev,
    ...captureOpts
  } = {}
) => {
  const { nodeCompartmentMap, nodeDataMap } = await makeNodeCompartmentMap(
    entrypointPath,
    {
      readPowers,
      dev,
      decorators,
      log,
      trustRoot,
    }
  )

  // we use this to inject missing imports from policy overrides into the module descriptor.
  // TODO: Endo should allow us to hook into `importHook` directly instead
  const PolicyGenCompartment = makePolicyGenCompartment(
    nodeCompartmentMap,
    nodeDataMap,
    policyOverride
  )

  /** @type {CaptureLiteOptions} */
  const captureLiteOptions = {
    ...DEFAULT_ENDO_OPTIONS,
    importHook: nullImportHook,
    Compartment: PolicyGenCompartment,
    ...captureOpts,
  }

  // captureFromMap finalizes the compartment map descriptor, but does not provide for execution.
  const {
    captureCompartmentMap: compartmentMap,
    captureSources: sources,
    // TODO: this could be more narrowly typed (though not super-straightforward)
    newToOldCompartmentNames: renames,
    // TODO: this too (see type assertion below)
    oldToNewCompartmentNames: dataMapRenames,
  } = await captureFromMap(readPowers, nodeCompartmentMap, captureLiteOptions)

  const dataMap = remapDataMap(
    nodeDataMap,
    /** @type {Record<keyof typeof nodeDataMap, string>} */ (dataMapRenames)
  )

  // just re-assert that we didn't lose any data in the remapping
  assertCompleteDataMap(compartmentMap, dataMap)

  return {
    compartmentMap,
    sources,
    renames,
    dataMap,
  }
}
