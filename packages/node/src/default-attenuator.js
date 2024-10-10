/**
 * Provides the default global and module attenuator
 *
 * @packageDocumentation
 */

import { endowmentsToolkit } from 'lavamoat-core'
import { POLICY_ITEM_ROOT } from './constants.js'
// eslint-disable-next-line n/prefer-global/console
const {
  values,
  entries,
  fromEntries,
  defineProperties,
  getOwnPropertyDescriptors,
} = Object

/**
 * @import {GlobalAttenuatorFn, ModuleAttenuatorFn} from '@endo/compartment-mapper'
 * @import {GlobalAttenuatorParams} from './types.js'
 * @import {LavaMoatPolicy} from 'lavamoat-core'
 */

/**
 * Picks stuff in the policy out of the original object
 *
 * @type {ModuleAttenuatorFn<[string, ...string[]]>}
 */
export const attenuateModule = (params, originalObject) => {
  return fromEntries(params.map((key) => [key, originalObject[key]]))
}

/**
 * @param {object} options
 * @param {LavaMoatPolicy} [options.policy]
 * @returns Attenuator
 * @internal
 */
export const makeGlobalsAttenuator = ({ policy } = { policy: undefined }) => {
  const knownWritableFields = new Set()

  if (policy) {
    values(policy.resources ?? {}).forEach((resource) => {
      if (resource.globals && typeof resource.globals === 'object') {
        entries(resource.globals).forEach(([key, value]) => {
          if (value === 'write') {
            knownWritableFields.add(key)
          }
        })
      }
    })
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
    if (policy === POLICY_ITEM_ROOT) {
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
}
export const attenuateGlobals = makeGlobalsAttenuator()
