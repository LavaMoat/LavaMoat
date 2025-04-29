import { ATTENUATORS_COMPARTMENT } from '../constants.js'
import { log as defaultLog } from '../log.js'
import { getCanonicalName } from '../policy-util.js'
import { hrLabel } from '../util.js'
/**
 * @import {CompartmentDescriptorTransform, CompartmentDescriptorTransformOptions} from '../types.js'
 * @import {CompartmentMapDescriptor} from '@endo/compartment-mapper'
 */

const { values } = Object

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
export const finalCompartmentDescriptorTransform = (
  compartmentDescriptor,
  { trustRoot = true, log = defaultLog } = {}
) => {
  if (compartmentDescriptor.name === ATTENUATORS_COMPARTMENT) {
    return
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
 * Applies a list of transforms to the compartment descriptors in the
 * compartment map.
 *
 * @param {CompartmentDescriptorTransform[]} compartmentDescriptorTransforms
 * @param {CompartmentMapDescriptor} compartmentMap
 * @param {CompartmentDescriptorTransformOptions} [options]
 */
export const applyTransforms = (
  compartmentDescriptorTransforms,
  compartmentMap,
  options
) => {
  values(compartmentMap.compartments).forEach((compartmentDescriptor) =>
    compartmentDescriptorTransforms.forEach((transform) =>
      transform(compartmentDescriptor, options)
    )
  )
}
