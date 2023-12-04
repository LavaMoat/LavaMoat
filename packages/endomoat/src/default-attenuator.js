import { ENDO_ROOT_POLICY as ROOT_POLICY } from './constants.js'
// @ts-expect-error - needs exports
import endowmentsToolkit from 'lavamoat-core/src/endowmentsToolkit.js'
// eslint-disable-next-line n/prefer-global/console
import console from 'node:console'

const { copyWrappedGlobals, getEndowmentsForConfig } = endowmentsToolkit()

const { keys, fromEntries, defineProperties, getOwnPropertyDescriptors } =
  Object

/** @type {object} */
let rootCompartmentGlobalThis

/**
 * @type {import('@endo/compartment-mapper').GlobalAttenuatorFn<[import('./policy-converter.js').LavaMoatPackagePolicy['globals']]>}
 */
export function attenuateGlobals(
  params,
  originalGlobalThis,
  packageCompartmentGlobalThis
) {
  const policy = params[0]
  if (!policy) {
    return
  }
  if (policy === ROOT_POLICY) {
    rootCompartmentGlobalThis = packageCompartmentGlobalThis
    // ^ this is a little dumb, but only a little - assuming importLocation is called only once in parallel. The thing is - even if it isn't, the new one will have a new copy of this module anyway.
    // That is unless we decide to use `modules` for passing the attenuator, in which case we have an attenuator defined outside of Endo and we can scope it as we wish. Tempting. Slightly less secure, because if we have a prototype pollution or RCE in the attenuator, we're exposing the outside instead of the attenuators compartment.
    copyWrappedGlobals(originalGlobalThis, packageCompartmentGlobalThis, [
      'globalThis',
      'global',
    ])
  } else {
    // TODO: getEndowmentsForConfig doesn't implement support for "write"
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
  // Write is per field not for all globals. It'll need to be implemented in getEndowmentsForConfig or the defineProperties step afterwards when it gets handled by another function from endowmentsToolkit (the latter more likely)
  // - if (policy === WRITE_POLICY) {
  // -   throw new Error('Not yet implemented')
  // - }
}

/**
 * Picks stuff in the policy out of the original object
 * @type {import('@endo/compartment-mapper').ModuleAttenuatorFn<[import('./policy-converter.js').LavaMoatPackagePolicy['packages']]>}
 */
export function attenuateModule(params, originalObject) {
  console.debug('attenuateModule called', params)
  const ns = fromEntries(
    keys(params).map((key) => [key, /** @type {any} */ (originalObject)[key]])
  )
  return ns
}
