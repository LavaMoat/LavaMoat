/**
 * Utilties for the policy generation
 *
 * @packageDocumentation
 * @internal
 */

import { hasValue, isObjectyObject } from '../util.js'

/**
 * @import {CompartmentDescriptor} from '@endo/compartment-mapper'
 * @import {ModuleDescriptor} from 'ses'
 */

/**
 * Returns `true` if the compartment descriptor is the entry compartment
 *
 * @param {CompartmentDescriptor} compartment
 * @returns {boolean}
 */
export const isEntryCompartment = (compartment) => {
  return compartment.path?.length === 0
}

/**
 * Type guard for a `Required<ModuleDescriptor>`.
 *
 * The `compartment` and `module` props are optional in the original type, but
 * we need both.
 *
 * @param {unknown} descriptor
 * @returns {descriptor is Required<ModuleDescriptor>}
 * @internal
 */
export const isCompleteModuleDescriptor = (descriptor) => {
  return !!(
    isObjectyObject(descriptor) &&
    hasValue(descriptor, 'compartment') &&
    hasValue(descriptor, 'module')
  )
}
