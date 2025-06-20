/**
 * Provides {@link makePolicyGenCompartment} which is hopefully temporary.
 *
 * @packageDocumentation
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { GenerationError } from '../error.js'
import { hrLabel } from '../format.js'
import { log as defaultLog } from '../log.js'
import { hasValue, isObject } from '../util.js'

/**
 * @import {CompartmentOptions,
 *   ImportHook,
 *   ModuleDescriptor,
 *   RecordModuleDescriptor,
 *   SourceModuleDescriptor,
 *   ModuleSource} from 'ses'
 * @import {Merge} from 'type-fest'
 * @import {CompleteCompartmentDescriptorDataMap} from '../types.js'
 * @import {GetValidCompartmentDescriptorFn, MakeGetHintsOptions, MakePolicyGenCompartmentOptions} from '../internal.js'
 * @import {CompartmentDescriptor, CompartmentMapDescriptor} from '@endo/compartment-mapper'
 * @import {LavaMoatPolicy} from 'lavamoat-core'
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
 * Append `hint` to the {@link ModuleSource.imports} field within a
 * {@link ModuleDescriptor}.
 *
 * `hint` may be a canonical name or a specifier, depending on whether it came
 * in via resource policy or `hints` proper.
 *
 * **This mutates `moduleDescriptor`** by overwriting its `ModuleSource` object
 * (which could be in either `source` or the deprecated `record` prop). It also
 * overwrites the `ModuleSource.imports` array. Overwritten objects are
 * originally non-extensible (frozen), so we must replace them outright.
 *
 * Once we have overwritten these objects, we should not overwrite them again;
 * instead, mutate them in-place to avoid potentially losing object references
 * elsewhere in `@endo/compartment-mapper`. This is a precautionary measure.
 *
 * @param {SourceModuleDescriptor | RecordModuleDescriptor} moduleDescriptor
 *   Module descriptor to update
 * @param {string} hint Canonical name, specifier, etc.
 * @returns {void}
 */
const applyHint = (moduleDescriptor, hint) => {
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

  // this just avoids adding duplicates. shouldn't happen, but who knows note
  // that it's theoretically possible that both a hint (e.g., `foo`) and a
  // canonical name (e.g., `bar>foo`) could be present in the imports list
  // (which refers to the same module). this should get sorted out either way,
  // though.
  if (moduleSource.imports.includes(hint)) {
    return
  }

  if (isFrozen(moduleSource)) {
    moduleSource = { ...moduleSource }
  }

  const imports = isFrozen(moduleSource.imports)
    ? [...moduleSource.imports]
    : moduleSource.imports

  if (path.isAbsolute(hint) && moduleDescriptor.importMeta) {
    const { url } = moduleDescriptor.importMeta
    hint = path.relative(fileURLToPath(url), hint)
    hint
  }
  imports.push(hint)

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
 * Creates a {@link GetValidCompartmentDescriptorFn} for this
 * {@link CompartmentMapDescriptor}.
 *
 * @param {CompartmentMapDescriptor} compartmentMap
 * @returns {GetValidCompartmentDescriptorFn}
 */
const makeGetValidCompartmentDescriptor = (compartmentMap) => {
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
 * @template {CompartmentMapDescriptor} [T=CompartmentMapDescriptor] Default is
 *   `CompartmentMapDescriptor`
 * @param {CompleteCompartmentDescriptorDataMap<T>} dataMap Compartment
 *   descriptor data
 * @param {GetValidCompartmentDescriptorFn} getValidCompartmentDescriptor
 * @param {MakeGetHintsOptions} [options] LavaMoat policy override
 * @returns {(compartmentDescriptor: CompartmentDescriptor) => Set<string>}
 */
const makeGetOverrideHints = (
  dataMap,
  getValidCompartmentDescriptor,
  { policyOverride, log = defaultLog } = {}
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

    if (!dataMap.has(compartmentDescriptor.location)) {
      throw new ReferenceError(
        `Compartment descriptor ${compartmentDescriptor.location} not found in data map`
      )
    }

    const { canonicalName } = dataMap.get(compartmentDescriptor.location) ?? {}

    if (!canonicalName) {
      throw new ReferenceError(
        `Compartment descriptor ${compartmentDescriptor.location} has no canonical name`
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

        if (!dataMap.has(otherCompartmentDescriptor.location)) {
          throw new ReferenceError(
            `Compartment descriptor ${otherCompartmentDescriptor.name} not found in data map`
          )
        }

        const { canonicalName: otherCanonicalName } =
          dataMap.get(otherCompartmentDescriptor.location) ?? {}

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

    if (hints.size) {
      log.debug(`${hrLabel(canonicalName)} - ${hints.size} hint(s) enqueued`)
    }

    return hints
  }

  return getHints
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
 * @template {CompartmentMapDescriptor} T
 * @param {T} compartmentMap
 * @param {CompleteCompartmentDescriptorDataMap<T>} dataMap
 * @param {MakePolicyGenCompartmentOptions} [options]
 * @returns {typeof Compartment} Either the original `Compartment` or a
 *   `PolicyGenCompartment`
 * @internal
 */
export const makePolicyGenCompartment = (
  compartmentMap,
  dataMap,
  { policyOverride, log = defaultLog } = {}
) => {
  if (!policyOverride?.resources) {
    return Compartment
  }

  /**
   * Lazily-created function to find hints for a given resource
   *
   * @type {(compartmentDescriptor: CompartmentDescriptor) => Set<string>}
   */
  let getOverrideHints

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

      // Compartment can be created without `importHook` or `name` but
      // @endo/compartment-mapper always provides them. This block should
      // never be reached - it's provided to avoid breaking the API if
      // the extended Compartment constructor is ever used to create a detached
      // compartment internally in compartment-mapper in the future.
      /* c8 ignore next */
      if (!importHook || !compartmentName) {
        super(options)
        return
      }

      /* c8 ignore next */
      if (!(compartmentName in compartmentMap.compartments)) {
        // We should not witness creation of compartmentswith impotHook
        // which are not present in the compartment map.
        // The only reason this doesn't throw is we're in policy generation and
        // the preferred outcome is an incomplete policy.
        // TODO: consider printing a warning
        super(options)
        return
      }

      /**
       * ImportHook which wraps the original `importHook` to potentially inject
       * names into {@link CompartmentDescriptor.modules}. The additional names
       * come from policy-overrides and supplement what @endo/compartment-mapper
       * was able to detect.
       *
       * @type {ImportHook}
       */
      const wrappedImportHook = async (specifier) => {
        const moduleDescriptor = await importHook(specifier)

        if (
          !isRecordModuleDescriptor(moduleDescriptor) &&
          !isSourceModuleDescriptor(moduleDescriptor)
        ) {
          // probably a builtin
          return moduleDescriptor
        }

        const compartmentDescriptor =
          compartmentMap.compartments[compartmentName]

        /* c8 ignore next */
        if (!compartmentDescriptor) {
          // See comment for unknown compartmentName in the constructor body.
          // Allowing a Compartment with an unknown name to work requires a
          // pass-through in this custom importHook.
          return moduleDescriptor
        }

        getOverrideHints ??= makeGetOverrideHints(
          dataMap,
          makeGetValidCompartmentDescriptor(compartmentMap),
          { policyOverride, log }
        )

        const hints = getOverrideHints(compartmentDescriptor)

        if (hints.size === 0) {
          // no hints to apply, so we can return the module descriptor as-is
          return moduleDescriptor
        }

        // Adds missing imports to the module descriptor from the
        // policy-override.
        for (const hint of hints) {
          // mutates `moduleDescriptor`!!
          applyHint(moduleDescriptor, hint)
        }

        return moduleDescriptor
      }

      super({ ...options, importHook: wrappedImportHook })
    }
  }

  return PolicyGenCompartment
}
