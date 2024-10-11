/**
 * Provides the default global and module attenuator
 *
 * @packageDocumentation
 */

/**
 * @privateRemarks
 * We cannot pull `endowmentsToolkit` from `lavamoat-core`, because it will blow
 * up our own policy generation; see `../scripts/update-own-policy.js`.
 *
 * We use a {@link endowmentsToolkit type assertion} instead to get our type
 * information.
 */
// @ts-expect-error - types not exported from here
import endowmentsToolkit_ from 'lavamoat-core/src/endowmentsToolkit.js'
import { POLICY_ITEM_ROOT, POLICY_ITEM_WRITE } from './constants.js'

/** @type {typeof import('lavamoat-core').endowmentsToolkit} */
const endowmentsToolkit = endowmentsToolkit_

/**
 * @import {GlobalAttenuatorFn, ModuleAttenuatorFn} from '@endo/compartment-mapper'
 * @import {GlobalAttenuatorParams} from './types.js'
 */

const { copyWrappedGlobals, getEndowmentsForConfig } = endowmentsToolkit()

const { fromEntries, defineProperties, getOwnPropertyDescriptors } = Object

/** @type {object} */
let rootCompartmentGlobalThis

/**
 * @type {GlobalAttenuatorFn<GlobalAttenuatorParams>}
 */
export const attenuateGlobals = (
  [policy],
  originalGlobalThis,
  packageCompartmentGlobalThis
) => {
  if (!policy) {
    return
  }
  if (policy === POLICY_ITEM_ROOT) {
    rootCompartmentGlobalThis = packageCompartmentGlobalThis
    // ^ this is a little dumb, but only a little - assuming importLocation is called only once in parallel. The thing is - even if it isn't, the new one will have a new copy of this module anyway.
    // That is unless we decide to use `modules` for passing the attenuator, in which case we have an attenuator defined outside of Endo and we can scope it as we wish. Tempting. Slightly less secure, because if we have a prototype pollution or RCE in the attenuator, we're exposing the outside instead of the attenuators compartment.
    copyWrappedGlobals(originalGlobalThis, packageCompartmentGlobalThis, [
      'globalThis',
      'global',
    ])
  } else if (policy === POLICY_ITEM_WRITE) {
    // TODO: implement
    // Write is per field not for all globals. It'll need to be implemented in getEndowmentsForConfig or the defineProperties step afterwards when it gets handled by another function from endowmentsToolkit (the latter more likely)
    // - if (policy === WRITE_POLICY) {
    // -   throw new Error('Not yet implemented')
    // - }
  } else {
    const endowments = getEndowmentsForConfig(
      rootCompartmentGlobalThis,
      policy,
      // rootCompartmentGlobalThis, // Not sure if it works, but with this as a 3rd argument, in theory, each compartment would unwrap functions to the root conpartment's globalThis, where all copied functions are set up to unwrap to actual globalThis
      // instead I'm opting for a single unwrap since we now have access to the actual globalThis
      originalGlobalThis,
      packageCompartmentGlobalThis
    )

    defineProperties(
      packageCompartmentGlobalThis,
      getOwnPropertyDescriptors(endowments)
    )
  }
}

/**
 * Picks stuff in the policy out of the original object
 *
 * @type {ModuleAttenuatorFn<
 *   [string, ...string[]],
 *   Record<string, unknown>
 * >}
 */
export const attenuateModule = (params, originalObject) =>
  fromEntries(params.map((key) => [key, originalObject[key]]))
