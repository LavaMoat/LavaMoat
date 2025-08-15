import { log as defaultLog } from '../log.js'

const { entries } = Object

/**
 * @import {CompartmentMapDescriptor, CompartmentDescriptor} from '@endo/compartment-mapper'
 * @import {GetValidCompartmentDescriptorFn, MakeGetHintsOptions} from '../internal.js'
 */

/**
 * Factory function for a thing which accepts a {@link CompartmentDescriptor}
 * (presumably one present in {@link CompartmentMapDescriptor.compartments}) and
 * returns a set of module names present in LavaMoat policy resources which need
 * to be updated.
 *
 * This does _not_ consider {@link LavaMoatPolicy.hints}; those need to be
 * handled during the initial `node_modules` crawl (see
 * `makeNodeCompartmentMap()`).
 *
 * @param {Map<string, string>} canonicalNameMap Canonical name mapping
 * @param {GetValidCompartmentDescriptorFn} getValidCompartmentDescriptor
 * @param {MakeGetHintsOptions} [options] LavaMoat policy override
 * @returns {(compartmentDescriptor: CompartmentDescriptor) => Set<string>}
 */
export const makeGetOverrideHints = (
  canonicalNameMap,
  getValidCompartmentDescriptor,
  { log: _log = defaultLog, policyOverride } = {}
) => {
  if (!policyOverride) {
    return () => new Set()
  }

  /**
   * A cache of {@link CompartmentDescriptor} to a list of module names present
   * in policy resources.
   *
   * @type {WeakMap<CompartmentDescriptor, Set<string>>}
   */
  const overriddenResourcesCache = new WeakMap()

  /**
   * Accepts a {@link CompartmentDescriptor} (presumably one present in
   * {@link CompartmentMapDescriptor.compartments}) and returns a set of module
   * names present in LavaMoat policy resources because it's possible that
   * policy-override contains package references that were added by the user
   * when not detected by policy generator on previous pass.
   *
   * Memoized on `CompartmentMapDescriptor`
   *
   * @param {CompartmentDescriptor} compartmentDescriptor Compartment to check
   * @returns {Set<string>} Keys in policy resources which need updating
   */
  const getHints = (compartmentDescriptor) => {
    if (overriddenResourcesCache.has(compartmentDescriptor)) {
      return /** @type {Set<string>} */ (
        overriddenResourcesCache.get(compartmentDescriptor)
      )
    }
    const { location } = compartmentDescriptor

    if (!canonicalNameMap.has(location)) {
      throw new ReferenceError(
        `Compartment descriptor ${location} not found in data map`
      )
    }

    const canonicalName = canonicalNameMap.get(location)

    if (!canonicalName) {
      throw new ReferenceError(
        `Compartment descriptor ${location} has no canonical name`
      )
    }

    /** @type {Set<string>} */
    let hints = new Set()

    const packagePolicy = policyOverride.resources?.[canonicalName]?.packages
    if (packagePolicy) {
      /**
       * A set of keys from {@link LavaMoatPolicy.resources} matching
       * {@link CompartmentDescriptor.modules the current `CompartmentDescriptor`'s `modules`}.
       * These will be updated by {@link applyHint}.
       *
       * Cached on {@link compartmentDescriptor}.
       */
      for (const [
        moduleDescriptorName,
        { compartment: moduleDescriptorCompartmentName },
      ] of entries(compartmentDescriptor.modules)) {
        if (!moduleDescriptorCompartmentName) {
          continue
        }
        const otherCompartmentDescriptor = getValidCompartmentDescriptor(
          compartmentDescriptor,
          moduleDescriptorCompartmentName
        )

        if (!otherCompartmentDescriptor) {
          continue
        }

        if (!canonicalNameMap.has(otherCompartmentDescriptor.location)) {
          throw new ReferenceError(
            `Compartment descriptor ${otherCompartmentDescriptor.name} not found in data map`
          )
        }

        const otherCanonicalName = canonicalNameMap.get(
          otherCompartmentDescriptor.location
        )

        if (!otherCanonicalName) {
          throw new ReferenceError(
            `Compartment descriptor ${otherCompartmentDescriptor.name} has no canonical name`
          )
        }

        if (!(otherCanonicalName in packagePolicy)) {
          continue
        }

        // this is _not_ the canonical name, but the compartment.name field,
        // which is different, but remains in a 1:1 relationship with the
        // canonical name. It's what @endo/compartment-mapper uses internally
        // for linking and finding compartments
        hints.add(moduleDescriptorName)
      }
    }

    return hints
  }

  return getHints
}

/**
 * Creates a {@link GetValidCompartmentDescriptorFn} for this
 * {@link CompartmentMapDescriptor}.
 *
 * @param {CompartmentMapDescriptor} compartmentMap
 * @returns {GetValidCompartmentDescriptorFn}
 */
export const makeGetValidCompartmentDescriptor = (compartmentMap) => {
  /**
   * Gets a {@link CompartmentDescriptor} based a compartment name, but only if
   * it's not the entry compartment or `currentCompartmentDescriptor` itself.
   *
   * @type {GetValidCompartmentDescriptorFn}
   */
  const getValidCompartmentDescriptor = (
    currentCompartmentDescriptor,
    compartmentName
  ) => {
    const moduleDescriptorCompartment =
      compartmentMap.compartments[compartmentName]

    /* c8 ignore next */
    if (!moduleDescriptorCompartment) {
      // "should never happen". maybe throw instead
      return
    }

    // All compartment descriptors will have a module descriptor which
    // refers to itself. We can safely ignore the module descriptor for
    // the current compartment, since we only wish to consider _other_
    // imports.
    if (moduleDescriptorCompartment === currentCompartmentDescriptor) {
      return
    }

    return moduleDescriptorCompartment
  }
  return getValidCompartmentDescriptor
}
