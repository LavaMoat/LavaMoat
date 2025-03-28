/**
 * Provides {@link makePolicyGenCompartment} which is hopefully temporary.
 *
 * @packageDocumentation
 */

import { GenerationError } from '../error.js'
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
 * @import {LavaMoatPolicy} from 'lavamoat-core'
 */

const { entries, isFrozen, fromEntries } = Object

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
    throw new GenerationError(
      `Unsupported module descriptor type; this is a bug`
    )
  }

  // this just avoids adding duplicates. shouldn't happen, but who knows
  if (moduleSource.imports.includes(canonicalName)) {
    return
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
    throw new GenerationError(
      `Unsupported module descriptor type; this is a bug`
    )
  }
}

/**
 * Factory function for a thing which Accepts a {@link CompartmentDescriptor}
 * (presumably one present in {@link CompartmentMapDescriptor.compartments}) and
 * returns a list of module names present in LavaMoat policy resources which
 * need to be updated.
 *
 * @param {CompartmentMapDescriptor} compartmentMap Compartment map descriptor
 * @param {Record<string, CompartmentDescriptor>} compartmentsByLabel
 * @param {LavaMoatPolicy} policyOverride LavaMoat policy override
 * @returns {(compartmentDescriptor: CompartmentDescriptor) => Set<string>}
 */
const makeGetOverriddenResourceNames = (
  compartmentMap,
  compartmentsByLabel,
  policyOverride
) => {
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

      return moduleDescriptorCompartment
    }
    const canonicalName = getCanonicalName(compartmentDescriptor)
    const packagePolicy =
      policyOverride.resources[canonicalName]?.packages ?? {}

    /**
     * A set of keys from {@link LavaMoatPolicy.resources} matching
     * {@link CompartmentDescriptor.modules the current `CompartmentDescriptor`'s `modules`}.
     * These will be updated by {@link updateModuleSource}.
     *
     * Cached on {@link compartmentDescriptor}.
     */
    const overriddenResources = entries(compartmentDescriptor.modules).reduce(
      (
        overriddenResources,
        [moduleDescriptorName, { compartment: moduleDescriptorCompartmentName }]
      ) => {
        if (!moduleDescriptorCompartmentName) {
          return overriddenResources
        }
        const otherCompartmentDescriptor = getValidCompartmentDescriptor(
          moduleDescriptorCompartmentName
        )
        if (
          !otherCompartmentDescriptor ||
          otherCompartmentDescriptor === compartmentDescriptor
        ) {
          return overriddenResources
        }

        const otherCanonicalName = getCanonicalName(otherCompartmentDescriptor)

        if (!(otherCanonicalName in packagePolicy)) {
          return overriddenResources
        }

        // this is _not_ the canonical name, but the compartment.name field,
        // which is kinda-sorta like a package name
        overriddenResources.add(moduleDescriptorName)

        return overriddenResources
      },
      /** @type {Set<string>} */ (new Set())
    )

    for (const [otherCanonicalName, otherPackagePolicyEntry] of entries(
      packagePolicy
    )) {
      if (otherPackagePolicyEntry === true) {
        const otherCompartmentDescriptor =
          compartmentsByLabel[otherCanonicalName]
        if (otherCompartmentDescriptor) {
          overriddenResources.add(otherCompartmentDescriptor.name)
        }
      }
    }
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
 * @param {LavaMoatPolicy} [policyOverride]
 * @returns {typeof Compartment} Either the original `Compartment` or a
 *   `PolicyGenCompartment`
 * @internal
 */
export const makePolicyGenCompartment = (compartmentMap, policyOverride) => {
  if (!policyOverride?.resources) {
    return Compartment
  }

  const compartmentsByLabel = fromEntries(
    entries(compartmentMap.compartments).map(([, compartment]) => [
      compartment.label,
      compartment,
    ])
  )

  const getOverriddenResourceNames = makeGetOverriddenResourceNames(
    compartmentMap,
    compartmentsByLabel,
    policyOverride
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
