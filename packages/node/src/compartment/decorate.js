/**
 * Provides compartment descriptor transforms.
 *
 * @packageDocumentation
 */

import { ATTENUATORS_COMPARTMENT } from '../constants.js'
import { log as defaultLog } from '../log.js'
import { getCanonicalName } from '../policy-util.js'
import { hrLabel } from '../util.js'
/**
 * @import {CompartmentDescriptorData, CompartmentDescriptorDataMap, CompartmentDescriptorDecorator, CompleteCompartmentDescriptorDataMap} from '../types.js'
 * @import {DecorateCompartmentMapOptions} from '../internal.js'
 * @import {CompartmentMapDescriptor} from '@endo/compartment-mapper'
 */

const { values, create } = Object

/**
 * Retains the canonical name of a compartment descriptor in its metadata
 *
 * @type {CompartmentDescriptorDecorator<
 *   Partial<CompartmentDescriptorData>,
 *   CompartmentDescriptorData
 * >}
 */
export const canonicalNameDecorator = (
  compartmentDescriptor,
  data,
  { trustRoot = true, log = defaultLog } = {}
) => {
  const canonicalName = getCanonicalName(compartmentDescriptor, trustRoot)
  log.debug(
    `Associated compartment label ${hrLabel(compartmentDescriptor.label)} with canonical name ${hrLabel(canonicalName)}`
  )
  return { ...data, canonicalName }
}

/**
 * Creates or updates a {@link CompartmentDescriptorDataMap} by applying
 * `decorators`.
 *
 * We cannot (simply) type the returned data map based on the return types of
 * `decorators` due to lack of existential types in TS; we can only make a
 * minimum assurance that a) each compartment descriptor has metadata and b)
 * that metadata extends `CompartmentDescriptorData`.
 *
 * @template {CompartmentMapDescriptor} [T=CompartmentMapDescriptor] Default is
 *   `CompartmentMapDescriptor`
 * @param {T} compartmentMap Compartment map to decorate
 * @param {CompartmentDescriptorDecorator[]} [decorators] Decorators to apply
 * @param {DecorateCompartmentMapOptions} [options] Options
 * @returns {CompleteCompartmentDescriptorDataMap<T>} Decorated data map
 */
export const decorateCompartmentMap = (
  compartmentMap,
  decorators = [],
  options = {}
) => {
  /** @type {CompartmentDescriptorDataMap} */
  const dataMap = new Map()
  for (const compartmentDescriptor of values(compartmentMap.compartments)) {
    if (compartmentDescriptor.name === ATTENUATORS_COMPARTMENT) {
      continue
    }
    for (const decorate of decorators) {
      const data = dataMap.get(compartmentDescriptor.location) ?? create(null)
      const newData = decorate(compartmentDescriptor, data, {
        dataMap,
        ...options,
      })
      dataMap.set(compartmentDescriptor.location, newData)
    }
  }

  return /** @type {CompleteCompartmentDescriptorDataMap<T>} */ (dataMap)
}
