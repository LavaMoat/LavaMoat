/**
 * Utilties for the policy generation
 *
 * @packageDocumentation
 * @internal
 */

import {
  ATTENUATORS_COMPARTMENT,
  LAVAMOAT_PKG_POLICY_ROOT,
} from '../constants.js'
import { hasValue, isObject } from '../util.js'

/**
 * @import {CompartmentDescriptor} from '@endo/compartment-mapper'
 * @import {ModuleDescriptor} from 'ses'
 */

/**
 * Determine the canonical name for a compartment descriptor
 *
 * @param {CompartmentDescriptor} compartment Compartment descriptor
 * @param {boolean} isEntry Whether or not the compartment is the entry
 *   compartment
 * @returns {string} Canonical name
 * @throws {TypeError} If compartment has no path
 * @throws {TypeError} If `isEntry` is truthy
 * @internal
 */
export const getCanonicalName = (compartment, isEntry = false) => {
  if (isEntry) {
    throw new TypeError('Entry compartment cannot have a canonical name')
  }
  if (compartment.name === ATTENUATORS_COMPARTMENT) {
    return ATTENUATORS_COMPARTMENT
  }
  if (!compartment.path?.length) {
    throw new TypeError(
      `Compartment ${compartment.name} has no path; cannot determine canonical name`
    )
  }
  return compartment.path.join('>')
}

/**
 * Determine the package name for a compartment descriptor
 *
 * @param {CompartmentDescriptor} compartment Compartment descriptor
 * @param {boolean} isEntry Whether or not the compartment is the entry
 *   compartment
 * @returns {string} Package name
 * @internal
 */
export const getPackageName = (compartment, isEntry = false) => {
  if (compartment.name.startsWith('file://')) {
    throw new TypeError(
      'Invalid compartment; did you call captureFromMap() yet?'
    )
  }
  if (isEntry) {
    return LAVAMOAT_PKG_POLICY_ROOT
  }
  return compartment.name
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
    isObject(descriptor) &&
    hasValue(descriptor, 'compartment') &&
    hasValue(descriptor, 'module')
  )
}
