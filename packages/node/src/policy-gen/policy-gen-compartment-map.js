/**
 * Provides {@link loadCompartmentMap}, which returns a compartment map
 * descriptor for a given entrypoint.
 */

import { captureFromMap } from '@endo/compartment-mapper/capture-lite.js'
import { mapNodeModules } from '@endo/compartment-mapper/node-modules.js'
import {
  applyTransforms,
  finalCompartmentDescriptorTransform,
} from '../compartment/compartment-descriptor-transform.js'
import { nullImportHook } from '../compartment/import-hook.js'
import { DEFAULT_ENDO_OPTIONS } from '../compartment/options.js'
import { defaultReadPowers } from '../compartment/power.js'
import { DEFAULT_TRUST_ROOT_COMPARTMENT } from '../constants.js'
import { GenerationError } from '../error.js'
import { log as defaultLog } from '../log.js'
import { toEndoURL } from '../util.js'
import { makePolicyGenCompartment } from './policy-gen-compartment-class.js'

/**
 * @import {LoadCompartmentMapForPolicyOptions, LoadCompartmentMapResult} from '../internal.js'
 */

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
 * @param {LoadCompartmentMapOptions} opts
 * @returns {Promise<LoadCompartmentMapResult>}
 * @internal
 */
export const loadCompartmentMap = async (
  entrypointPath,
  {
    readPowers = defaultReadPowers,
    policyOverride,
    trustRoot,
    log = defaultLog,
    compartmentDescriptorTransforms = [],
    dev,
    ...captureOpts
  } = {}
) => {
  // some packages use "node" as a condition (as opposed to "browser")
  const conditions = new Set(['node'])

  const entrypoint = toEndoURL(entrypointPath)

  const nodeCompartmentMap = await mapNodeModules(readPowers, entrypoint, {
    conditions,
    dev,
    languageForExtension: DEFAULT_ENDO_OPTIONS.languageForExtension,
  })

  compartmentDescriptorTransforms.push(finalCompartmentDescriptorTransform)

  applyTransforms(compartmentDescriptorTransforms, nodeCompartmentMap, {
    trustRoot,
    log,
  })

  // we use this to inject missing imports from policy overrides into the module descriptor.
  // TODO: Endo should allow us to hook into `importHook` directly instead
  const PolicyGenCompartment = makePolicyGenCompartment(
    nodeCompartmentMap,
    policyOverride
  )

  const {
    captureCompartmentMap: compartmentMap,
    captureSources: sources,
    newToOldCompartmentNames: renames,
  } = await captureFromMap(readPowers, nodeCompartmentMap, {
    ...DEFAULT_ENDO_OPTIONS,
    importHook: nullImportHook,
    Compartment: PolicyGenCompartment,
    ...captureOpts,
  })

  return {
    compartmentMap,
    sources,
    renames,
  }
}
