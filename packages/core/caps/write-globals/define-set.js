/// <reference path="../capability-env.d.ts" />
/* global defineCapability */

const { create, assign, defineProperty, prototype: objectPrototype } = Object
const { for: symbolFor } = Symbol
const endowedKeys = new WeakMap()
const endowedSymbols = new WeakMap()

/**
 * @param {Record<PropertyKey, any>} target
 * @param {PropertyKey} key
 * @param {PropertyDescriptor} descriptor
 * @returns {boolean}
 */
const patchedRedefine = (target, key, descriptor) => {
  const lookup = typeof key === 'symbol' ? endowedSymbols : endowedKeys
  if (lookup.has(target) && lookup.get(target).includes(key)) {
    target[key] = descriptor.value
    return true
  }
  defineProperty(target, key, descriptor)
  return true
}

// Instead of a global repair, replace the Object of compartments where this is expected to work.
// note that Object.prototype is shared so that we don't introduce identity discontinuity.
const patchedObject = assign(create(objectPrototype), Object)
defineProperty(patchedObject, 'defineProperty', {
  value: patchedRedefine,
  writable: true,
  configurable: true,
  enumerable: false,
})

defineCapability('support-define-global', {
  ambient: false, // if true, applies to every compartment automatically
  endow: ({
    options, // array of options from the resource's capabilities entry
    endowments, // the proposed endowments object (after getEndowmentsForConfig)
    compartmentGlobalThis, // the compartment's globalThis
    _rootCompartmentGlobalThis, // the root compartment's globalThis
  }) => {
    endowedKeys.set(compartmentGlobalThis, options || [])

    endowments.Object = patchedObject
  },
})

defineCapability('support-define-symbol', {
  ambient: false,
  endow: ({
    options,
    endowments,
    compartmentGlobalThis,
    _rootCompartmentGlobalThis,
  }) => {
    endowedSymbols.set(compartmentGlobalThis, (options || []).map(symbolFor))

    endowments.Object = patchedObject
  },
})
