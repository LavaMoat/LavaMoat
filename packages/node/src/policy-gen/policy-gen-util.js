/**
 * Utilties for the policy generation
 *
 * @packageDocumentation
 * @internal
 */

import { LAVAMOAT_PKG_POLICY_ROOT } from '../constants.js'
import { GenerationError } from '../error.js'
import { hasValue, isObjectyObject } from '../util.js'

/**
 * @import {CompartmentDescriptor} from '@endo/compartment-mapper'
 * @import {ModuleDescriptor} from 'ses'
 * @import {CanonicalName} from '../internal.js'
 */

/**
 * Determine the canonical name for a compartment descriptor
 *
 * @param {CompartmentDescriptor} compartment Compartment descriptor
 * @param {boolean} [trustRoot=true] If `false`, never return a canonical name
 *   of {@link LAVAMOAT_PKG_POLICY_ROOT}. Default is `true`
 * @returns {CanonicalName} Canonical name
 * @throws {ReferenceError} If compartment has no path
 * @internal
 */
export const getCanonicalName = (compartment, trustRoot = true) => {
  // NOTE: the algorithm creating paths happens to be identical to the one in @lavamoat/aa package. Not that it matters because policies cannot be reused between this and other lavamoat tools.
  if (!compartment.path) {
    throw new GenerationError(
      `Computing canonical name failed: compartment "${compartment.name}" (${compartment.location}) has no "path" property; this is a bug`
    )
  }
  if (isEntryCompartment(compartment)) {
    if (trustRoot) {
      return LAVAMOAT_PKG_POLICY_ROOT
    }
    return compartment.name
  }
  return compartment.path.join('>')
}

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
