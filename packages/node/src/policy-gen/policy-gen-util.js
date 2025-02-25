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
 * @returns {string} Canonical name
 * @throws {TypeError} If compartment has no path
 * @internal
 */
export const getCanonicalName = (compartment) => {
  // NOTE: the algorithm creating paths happens to be identical to the one in @lavamoat/aa package. Not that it matters because policies cannot be reused between this and other lavamoat tools.
  if (compartment.name === ATTENUATORS_COMPARTMENT) {
    return ATTENUATORS_COMPARTMENT
  }
  if (!compartment.path) {
    throw new ReferenceError(
      `Computing canonical name failed: compartment "${compartment.name}" (${compartment.location}) has no "path" property; this is a bug`
    )
  }
  if (compartment.path.length === 0) {
    return LAVAMOAT_PKG_POLICY_ROOT
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
  return compartment.label
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
