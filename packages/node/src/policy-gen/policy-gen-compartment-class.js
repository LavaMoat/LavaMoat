/**
 * Provides {@link makePolicyGenCompartment} which is hopefully temporary.
 *
 * @packageDocumentation
 */

import { hasValue, isObject } from '../util.js'
import { getCanonicalName } from './policy-gen-util.js'

/**
 * @import {CompartmentOptions,
 *   ImportHook,
 *   ModuleDescriptor,
 *   RecordModuleDescriptor,
 *   SourceModuleDescriptor,
 *   ModuleSource} from 'ses'
 * @import {Merge} from 'type-fest'
 * @import {CompartmentDescriptor, CompartmentMapDescriptor} from '@endo/compartment-mapper'
 * @import {LavaMoatPolicyOverrides, Resources} from '@lavamoat/types'
 */

const { entries, isFrozen } = Object

/**
 * Type guard for a {@link RecordModuleDescriptor} containing a
 * {@link ModuleSource}
 *
 * @param {ModuleDescriptor} moduleDescriptor
 * @returns {moduleDescriptor is Merge<RecordModuleDescriptor, {record: ModuleSource}>}
 */
const isRecordModuleDescriptor = (moduleDescriptor) =>
  isObject(moduleDescriptor) &&
  hasValue(moduleDescriptor, 'record') &&
  isObject(moduleDescriptor.record)

/**
 * Type guard for a {@link SourceModuleDescriptor} containing a
 * {@link ModuleSource}
 *
 * @param {ModuleDescriptor} moduleDescriptor
 * @returns {moduleDescriptor is Merge<SourceModuleDescriptor, {source: ModuleSource}>}
 */
const isSourceModuleDescriptor = (moduleDescriptor) =>
  isObject(moduleDescriptor) &&
  hasValue(moduleDescriptor, 'source') &&
  isObject(moduleDescriptor.source)

/**
 * Append `canonicalName` to the {@link ModuleSource.imports} field within a
 * {@link ModuleDescriptor}.
 *
 * This mutates `moduleDescriptor` by overwriting its `ModuleSource` object
 * (which could be in either `source` or the deprecated `record` prop). It also
 * overwrites the `ModuleSource.imports` array. Overwritten objects are
 * originally non-extensible (frozen), so we must replace them outright.
 *
 * Once we have overwritten these objects, we should not overwrite them again;
 * instead, mutate them in-place to avoid potentially losing object references
 * elsewhere in `@endo/compartment-mapper`. This is a precautionary measure.
 *
 * @template {SourceModuleDescriptor | RecordModuleDescriptor} T
 * @param {T} moduleDescriptor - Module descriptor to update
 * @param {string} canonicalName - Canonical name to append to
 *   {@link ModuleSource.imports}
 */
const updateModuleSource = (moduleDescriptor, canonicalName) => {
  let moduleSource = isRecordModuleDescriptor(moduleDescriptor)
    ? moduleDescriptor.record
    : isSourceModuleDescriptor(moduleDescriptor)
      ? moduleDescriptor.source
      : undefined

  if (!moduleSource) {
    throw new TypeError(`Unsupported module descriptor type; this is a bug`)
  }

  if (isFrozen(moduleSource)) {
    moduleSource = { ...moduleSource }
  }

  const imports = isFrozen(moduleSource.imports)
    ? [...moduleSource.imports]
    : moduleSource.imports
  imports.push(canonicalName)

  moduleSource.imports = imports

  if (isRecordModuleDescriptor(moduleDescriptor)) {
    moduleDescriptor.record = moduleSource
  } else if (isSourceModuleDescriptor(moduleDescriptor)) {
    moduleDescriptor.source = moduleSource
  } else {
    throw new TypeError(`Unsupported module descriptor type; this is a bug`)
  }
}

/**
 * Factory function for a thing which Accepts a {@link CompartmentDescriptor}
 * (presumably one present in {@link CompartmentMapDescriptor.compartments}) and
 * returns a list of module names present in LavaMoat policy resources which
 * need to be updated.
 *
 * @param {CompartmentMapDescriptor} compartmentMap Compartment map descriptor
 * @param {Resources} resources `resources` of LavaMoat policy
 * @returns {(compartmentDescriptor: CompartmentDescriptor) => Set<string>}
 */
const makeGetOverriddenResourceNames = (compartmentMap, resources) => {
  /**
   * A cache of {@link CompartmentDescriptor} to a list of module names present
   * in policy resources.
   *
   * @type {WeakMap<CompartmentDescriptor, Set<string>>}
   */
  const overriddenResourcesCache = new WeakMap()

  /**
   * Accepts a {@link CompartmentDescriptor} (presumably one present in
   * {@link CompartmentMapDescriptor.compartments}) and returns a list of module
   * names present in LavaMoat policy resources which need to be updated.
   *
   * Memoized on `CompartmentMapDescriptor`
   *
   * @param {CompartmentDescriptor} compartmentDescriptor Compartment to check
   * @returns {Set<string>} Keys in policy resources which need updating
   */
  const getOverriddenResources = (compartmentDescriptor) => {
    if (overriddenResourcesCache.has(compartmentDescriptor)) {
      return /** @type {Set<string>} */ (
        overriddenResourcesCache.get(compartmentDescriptor)
      )
    }

    /**
     * Gets a valid {@link CompartmentDescriptor} from a compartment name, but
     * only if it's not the entry compartment or the
     * {@link compartmentDescriptor current one}.
     *
     * @param {string} [compartmentName] Compartment name
     * @returns {CompartmentDescriptor | undefined}
     */
    const getValidCompartmentDescriptor = (compartmentName) => {
      /* c8 ignore next */
      if (!compartmentName) {
        // The `compartment` prop can be `undefined` per the typings, though
        // I'm not sure if this will ever occur in practice.
        return
      }

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
      if (moduleDescriptorCompartment === compartmentDescriptor) {
        return
      }

      /* c8 ignore next */
      if (compartmentMap.entry.compartment === compartmentName) {
        // This also "should never happen", as a foreign compartment should
        // not be importing the entry compartment. Also, the entry
        // compartment cannot have a canonical name, and we need a canonical
        // name to apply policy
        throw new ReferenceError(
          `Unexpected entry compartment encountered in ${moduleDescriptorCompartment.label}; this is a bug`
        )
      }

      return moduleDescriptorCompartment
    }

    /**
     * A set of keys from {@link LavaMoatPolicyOverrides.resources} matching
     * {@link CompartmentDescriptor.modules the current `CompartmentDescriptor`'s `modules`}.
     * These will be updated by {@link updateModuleSource}.
     *
     * Cached on {@link compartmentDescriptor}.
     *
     * @type {Set<string>}
     */
    const overriddenResources = entries(compartmentDescriptor.modules).reduce(
      (
        overriddenResources,
        [moduleDescriptorName, { compartment: moduleDescriptorCompartmentName }]
      ) => {
        const otherCompartmentDescriptor = getValidCompartmentDescriptor(
          moduleDescriptorCompartmentName
        )
        if (!otherCompartmentDescriptor) {
          return overriddenResources
        }
        const canonicalName = getCanonicalName(otherCompartmentDescriptor)
        if (hasValue(resources, canonicalName)) {
          overriddenResources.add(moduleDescriptorName)
        }
        return overriddenResources
      },
      new Set()
    )
    overriddenResourcesCache.set(compartmentDescriptor, overriddenResources)

    return overriddenResources
  }
  return getOverriddenResources
}

/**
 * Returns a constructor for a subclass of `ses`' `Compartment` which injects a
 * package (defined in policy overrides) into the instance's
 * {@link ModuleDescriptor ModuleDescriptors}.
 *
 * This causes the new imports to be resolved and expanded as if their usage was
 * detected. The aim is to cause a generated policy to reflect the state of the
 * overrides, but not be _limited to_ those overrides (as would likely occur if
 * we merged them verbatim). This hopefully prevents the end-user from needing
 * to hand-craft a giant policy override.
 *
 * @param {CompartmentMapDescriptor} compartmentMap
 * @param {LavaMoatPolicyOverrides} [policyOverride]
 * @returns {typeof Compartment} Either the original `Compartment` or a
 *   `PolicyGenCompartment`
 * @internal
 */
export const makePolicyGenCompartment = (compartmentMap, policyOverride) => {
  if (!policyOverride || !policyOverride.resources) {
    return Compartment
  }

  // only create this function and resulting `Compartment` if we have resources
  // in the policy override
  const getOverriddenResourceNames = makeGetOverriddenResourceNames(
    compartmentMap,
    policyOverride.resources
  )

  /**
   * A subclass of `Compartment` which injects a package (defined in policy
   * overrides) into its associated {@link CompartmentDescriptor.modules} record,
   * which influences the behavior of linking.
   */
  class PolicyGenCompartment extends Compartment {
    /**
     * Wraps the `Compartment`'s `ImportHook` to potentially inject names into
     * its list of `ModuleDescriptor`s.
     *
     * @param {CompartmentOptions} [options]
     */
    constructor(options = {}) {
      const { importHook, name: compartmentName } = options

      // the following block may never be executed, but it's here because
      // these properties are not guaranteed to be present in the options, per typings
      /* c8 ignore next */
      if (!importHook || !compartmentName) {
        super(options)
        return
      }

      /* c8 ignore next */
      if (!(compartmentName in compartmentMap.compartments)) {
        // I don't know if this will ever happen
        super(options)
        return
      }

      /**
       * ImportHook which wraps the original `importHook` to potentially inject
       * names into {@link CompartmentDescriptor.modules}
       *
       * @type {ImportHook}
       */
      const wrappedImportHook = async (specifier) => {
        const moduleDescriptor = await importHook(specifier)

        /* c8 ignore next */
        if (
          !isRecordModuleDescriptor(moduleDescriptor) &&
          !isSourceModuleDescriptor(moduleDescriptor)
        ) {
          // unknown if this ever happens
          return moduleDescriptor
        }

        const compartmentDescriptor =
          compartmentMap.compartments[compartmentName]

        /* c8 ignore next */
        if (!compartmentDescriptor) {
          // "should never happen". might want to throw
          return moduleDescriptor
        }

        for (const overriddenResourceName of getOverriddenResourceNames(
          compartmentDescriptor
        )) {
          // mutates `moduleDescriptor`!!
          updateModuleSource(moduleDescriptor, overriddenResourceName)
        }

        return moduleDescriptor
      }

      super({ ...options, importHook: wrappedImportHook })
    }
  }

  return PolicyGenCompartment
}
