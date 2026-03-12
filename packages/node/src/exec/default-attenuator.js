/**
 * Provides the default global and module attenuator
 *
 * @packageDocumentation
 * @internal
 */

import { endowmentsToolkit } from 'lavamoat-core'
import { scuttle } from 'lavamoat-core/src/scuttle.js'
import {
  DEFAULT_TRUST_ROOT_COMPARTMENT,
  ENDO_POLICY_ITEM_ROOT,
  GLOBAL_THIS_REFS,
  LAVAMOAT_POLICY_ITEM_WRITE,
} from '../constants.js'
import { AttenuationError } from '../error.js'
import { isObjectyObject } from '../util.js'

/**
 * @import {MakeGlobalsAttenuatorOptions} from '../internal.js'
 * @import {GlobalAttenuatorFn, ModuleAttenuatorFn} from '@endo/compartment-mapper'
 * @import {GlobalAttenuatorParams} from '../types.js'
 */

const {
  values,
  entries,
  fromEntries,
  defineProperties,
  getOwnPropertyDescriptors,
} = Object

/**
 * Creates a global attenuator
 *
 * **REMEMBER: The attenuator is _not applied_ to packages without policy!** use
 * ExecutionCompartment if you want to customize globals regardless of policy
 *
 * @param {MakeGlobalsAttenuatorOptions} [options]
 * @returns {{
 *   attenuateGlobals: GlobalAttenuatorFn<GlobalAttenuatorParams>
 *   attenuateModule: ModuleAttenuatorFn<
 *     [string, ...string[]],
 *     Record<string, unknown>
 *   >
 * }}
 * @internal
 */
export const makeAttenuators = ({
  policy: { resources } = { resources: {} },
  scuttleGlobalThis = { enabled: false },
  trustRoot = DEFAULT_TRUST_ROOT_COMPARTMENT,
} = {}) => {
  /** @type {Set<string>} */
  const knownWritableFields = new Set()

  // gather writable fields from policy. this is needed by `endowmentsToolkit`
  if (resources) {
    for (const resource of values(resources)) {
      if (isObjectyObject(resource.globals)) {
        for (const [key, value] of entries(resource.globals)) {
          if (value === LAVAMOAT_POLICY_ITEM_WRITE) {
            knownWritableFields.add(key)
          }
        }
      }
    }
  }

  const { getEndowmentsForConfig, copyWrappedGlobals, attenuateBuiltin } =
    endowmentsToolkit({
      handleGlobalWrite: knownWritableFields.size > 0,
      knownWritableFields,
    })

  /** @type {object} */
  let rootCompartmentGlobalThis

  /**
   * This is used to defer the attenuation of non-root compartments until the
   * root compartment is attenuated.
   *
   * The root compartment must be attenuated first in order to set the root
   * compartment's `globalThis`, from which all other compartments'
   * `globalThis`'s inherit.
   *
   * Only used if {@link trustRoot} is `true`.
   *
   * @type {(() => void)[]}
   */
  const deferredAttenuations = []

  /**
   * The global attenuator function
   *
   * @type {GlobalAttenuatorFn<GlobalAttenuatorParams>}
   * @see {@link deferredAttenuations}
   */
  const attenuateGlobals = (
    [policy],
    originalGlobalThis,
    packageCompartmentGlobalThis
  ) => {
    /**
     * The _real_ global attenuator function.
     *
     * @type {GlobalAttenuatorFn<GlobalAttenuatorParams>}
     */
    const attenuateGlobals_ = (
      [policy],
      originalGlobalThis,
      packageCompartmentGlobalThis
    ) => {
      if (!policy) {
        return
      }

      if (policy === ENDO_POLICY_ITEM_ROOT) {
        if (rootCompartmentGlobalThis) {
          throw new AttenuationError(
            'Root compartment globalThis already initialized; this is a bug'
          )
        }
        rootCompartmentGlobalThis = packageCompartmentGlobalThis
        copyWrappedGlobals(originalGlobalThis, packageCompartmentGlobalThis, [
          'globalThis',
          'global',
        ])
        scuttle(originalGlobalThis, scuttleGlobalThis)
      } else {
        if (!rootCompartmentGlobalThis) {
          if (trustRoot) {
            throw new AttenuationError(
              'Intializing an anonymous root compartment globalThis for trusted root is not allowed; this is a bug'
            )
          }
          rootCompartmentGlobalThis = new Compartment().globalThis
          copyWrappedGlobals(originalGlobalThis, rootCompartmentGlobalThis, [
            'globalThis',
            'global',
          ])
          scuttle(originalGlobalThis, {
            ...scuttleGlobalThis,
            enabled: !!scuttleGlobalThis.enabled,
          })
        }

        const endowments = getEndowmentsForConfig(
          rootCompartmentGlobalThis,
          /**
           * **HAZARD**: In this block, `policy` is of type
           * `Omit<GlobalAttenuatorParams, RootPolicy>` (a.k.a.
           * `WritablePropertyPolicy`); the value comes _directly_ from an Endo
           * `Policy`. `policy` _corresponds to_ LM's `GlobalPolicy`, but is
           * _not_ the same value from the original LavaMoat policy!
           *
           * `getEndowmentsForConfig()` accepts a LavaMoat `ResourcePolicy`
           * having a `globals` prop (a `GlobalPolicy`). Since we control the
           * types of the parameters provided to the attenuator
           * (`GlobalAttenuatorParams`), we've made those parameters (the first
           * of which is `policy`) structurally compatible with a
           * `GlobalPolicy`. Below, we're creating a phony `ResourcePolicy` to
           * make it fit.
           */
          { globals: policy },
          // Not sure if it works, but with this as a 3rd argument, in theory,
          // each compartment would unwrap functions to the root compartment's
          // globalThis, where all copied functions are set up to unwrap to actual
          // globalThis instead I'm opting for a single unwrap since we now have
          // access to the actual globalThis
          originalGlobalThis,
          packageCompartmentGlobalThis
        )

        defineProperties(packageCompartmentGlobalThis, {
          ...getOwnPropertyDescriptors(endowments),
          // preserve the correct global aliases even if endowments define them differently
          ...fromEntries(
            GLOBAL_THIS_REFS.map((ref) => [
              ref,
              { value: packageCompartmentGlobalThis },
            ])
          ),
        })
      }
    }

    // an untrusted root will not have a ENDO_POLICY_ITEM_ROOT policy, so we
    // don't need to defer attenuations until rootCompartmentGlobalThis is set.
    if (trustRoot && !rootCompartmentGlobalThis) {
      if (policy === ENDO_POLICY_ITEM_ROOT) {
        attenuateGlobals_(
          [policy],
          originalGlobalThis,
          packageCompartmentGlobalThis
        )
        for (const deferredAttenuation of deferredAttenuations) {
          deferredAttenuation()
        }
        deferredAttenuations.length = 0
      } else {
        deferredAttenuations.push(
          attenuateGlobals_.bind(
            null,
            [policy],
            originalGlobalThis,
            packageCompartmentGlobalThis
          )
        )
      }
      return
    }

    attenuateGlobals_(
      [policy],
      originalGlobalThis,
      packageCompartmentGlobalThis
    )
  }

  /**
   * Narrows down the module namespace based on policy
   *
   * @type {ModuleAttenuatorFn<
   *   [string, ...string[]],
   *   Record<string, unknown>
   * >}
   */
  const attenuateModule = (params, originalObject) => {
    return attenuateBuiltin(originalObject, params)
    // NOTE: the way attenuation via Endo works now, it doesn't leverage the explicitlyBanned logic and therefore might be less strict in creating subsets. we might wanna change what's being passed as params here
  }

  return {
    attenuateGlobals,
    attenuateModule,
  }
}
