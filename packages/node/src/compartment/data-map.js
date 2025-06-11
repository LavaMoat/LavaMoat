/**
 * Provides utility functions for working with compartment descriptor metadata
 *
 * @internal
 * @packageDocumentation
 */

import { ATTENUATORS_COMPARTMENT } from '../constants.js'
import { hrPath } from '../format.js'
import { hasValue } from '../util.js'

/**
 * @import {CompartmentMapDescriptor} from '@endo/compartment-mapper'
 * @import {CompartmentDescriptorDataMap, CompleteCompartmentDescriptorDataMap} from '../types.js'
 */

const { keys } = Object

/**
 * Sanity-checking function to ensure `dataMap` contains metadata for everything
 * in `compartmentMap`.
 *
 * @template {CompartmentMapDescriptor} [T=CompartmentMapDescriptor] Default is
 *   `CompartmentMapDescriptor`
 * @param {T} compartmentMap Compartment map to check
 * @param {CompartmentDescriptorDataMap} dataMap Associated data map
 * @returns {asserts dataMap is CompleteCompartmentDescriptorDataMap<T>}
 * @internal
 */
export const assertCompleteDataMap = (compartmentMap, dataMap) => {
  for (const location of keys(compartmentMap.compartments)) {
    if (location === ATTENUATORS_COMPARTMENT) {
      continue
    }
    const data = dataMap.get(location)
    if (!data) {
      throw new ReferenceError(
        `Missing metadata for compartment at ${hrPath(location)}`
      )
    }
    if (!hasValue(data, 'canonicalName')) {
      throw new TypeError(
        `Missing canonical name in metadata for compartment at ${hrPath(location)}`
      )
    }
  }
}
