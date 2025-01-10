/**
 * Provides the default global and module attenuator
 *
 * @packageDocumentation
 * @internal
 */

import { endowmentsToolkit } from 'lavamoat-core'
import {
  ENDO_POLICY_ITEM_ROOT,
  LAVAMOAT_POLICY_ITEM_WRITE,
} from '../constants.js'
import { isObject } from '../util.js'

/**
 * @import {GlobalAttenuatorFn, ModuleAttenuatorFn} from '@endo/compartment-mapper'
 * @import {GlobalAttenuatorParams} from '../types.js'
 * @import {LavaMoatPolicy} from '@lavamoat/types'
 */

const {
  values,
  entries,
  fromEntries,
  defineProperties,
  getOwnPropertyDescriptors,
} = Object

/**
 * Picks stuff in the policy out of the original object
 *
 * @type {ModuleAttenuatorFn<
 *   [string, ...string[]],
 *   Record<string, unknown>
 * >}
 * @internal
 */
export const attenuateModule = (params, originalObject) => {
  return fromEntries(params.map((key) => [key, originalObject[key]]))
}

/**
 * Creates a global attenuator
 *
 * **REMEMBER: The attenuator is _not applied_ to packages without policy!**
 *
 * @param {object} options
 * @param {Partial<LavaMoatPolicy>} [options.policy]
 * @returns {GlobalAttenuatorFn<GlobalAttenuatorParams>}
 * @internal
 */
export const makeGlobalsAttenuator = (
  { policy: lavaMoatPolicy } = { policy: undefined }
) => {
  /** @type {Set<string>} */
  const knownWritableFields = new Set()

  // gather writable fields from policy. this is needed by `endowmentsToolkit`
  if (lavaMoatPolicy?.resources) {
    for (const resource of values(lavaMoatPolicy.resources)) {
      if (isObject(resource.globals)) {
        for (const [key, value] of entries(resource.globals)) {
          if (value === LAVAMOAT_POLICY_ITEM_WRITE) {
            knownWritableFields.add(key)
          }
        }
      }
    }
  }

  const { getEndowmentsForConfig, copyWrappedGlobals } = endowmentsToolkit({
    handleGlobalWrite: knownWritableFields.size > 0,
    knownWritableFields,
  })

  /** @type {object} */
  let rootCompartmentGlobalThis

  /**
   * @type {GlobalAttenuatorFn<GlobalAttenuatorParams>}
   */
  return ([policy], originalGlobalThis, packageCompartmentGlobalThis) => {
    if (!policy) {
      return
    }
    if (policy === ENDO_POLICY_ITEM_ROOT) {
      rootCompartmentGlobalThis = packageCompartmentGlobalThis
      // ^ this is a little dumb, but only a little - assuming importLocation is called only once in parallel. The thing is - even if it isn't, the new one will have a new copy of this module anyway.
      // That is unless we decide to use `modules` for passing the attenuator, in which case we have an attenuator defined outside of Endo and we can scope it as we wish. Tempting. Slightly less secure, because if we have a prototype pollution or RCE in the attenuator, we're exposing the outside instead of the attenuators compartment.
      copyWrappedGlobals(originalGlobalThis, packageCompartmentGlobalThis, [
        'globalThis',
        'global',
      ])
    } else {
      const endowments = getEndowmentsForConfig(
        rootCompartmentGlobalThis,
        /**
         * **HAZARD**: In this block, `policy` is of type
         * `Omit<GlobalAttenuatorParams, RootPolicy>` (a.k.a.
         * `WritablePropertyPolicy`); the value comes _directly_ from an Endo
         * `Policy`. `policy` _corresponds to_ LM's `GlobalPolicy`, but is _not_
         * the same value from the original LavaMoat policy!
         *
         * `getEndowmentsForConfig()` accepts a LavaMoat `ResourcePolicy` having
         * a `globals` prop (a `GlobalPolicy`). Since we control the types of
         * the parameters provided to the attenuator (`GlobalAttenuatorParams`),
         * we've made those parameters (the first of which is `policy`)
         * structurally compatible with a `GlobalPolicy`. Below, we're creating
         * a phony `ResourcePolicy` to make it fit.
         */
        { globals: policy },
        // Not sure if it works, but with this as a 3rd argument, in theory, each compartment would unwrap functions to the root conpartment's globalThis, where all copied functions are set up to unwrap to actual globalThis
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
}

/**
 * Default global attenuator.
 *
 * @type {GlobalAttenuatorFn<GlobalAttenuatorParams>}
 * @internal
 */
export const attenuateGlobals = makeGlobalsAttenuator()
