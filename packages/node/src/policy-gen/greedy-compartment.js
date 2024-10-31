/**
 * Provides {@link GreedyCompartment}, which you can just pretend doesn't exist.
 *
 * The purpose of this is to expand the compartment map with resources mentioned
 * in policy overrides when generating policy. The goal is to reduce the chance
 * that a policy override author would need to hand-craft a large policy
 * override for any given resource.
 *
 * @packageDocumentation
 */

import { hasValue, isObject } from '../util.js'
import { getCanonicalName } from './util.js'

/**
 * @import {CompartmentOptions, ImportHook, ModuleDescriptor, RecordModuleDescriptor, SourceModuleDescriptor, ModuleSource} from 'ses'
 * @import {Merge} from 'type-fest'
 * @import {CompartmentMapDescriptor} from '@endo/compartment-mapper'
 * @import {LavaMoatPolicyOverrides} from 'lavamoat-core'
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
 * Returns a constructor for a subclass of `ses`' `Compartment` which injects
 * package from policy overrides into compartment `imports` if not already
 * present.
 *
 * This causes the new imports to be resolved and expanded as if their usage was
 * detected. The aim is to cause a generated policy to reflect the state of the
 * overrides, but not be _limited to_ those overrides (as would likely occur if
 * we merged them verbatim). This hopefully prevents the end-user from needing
 * to hand-craft a giant policy override.
 *
 * @param {CompartmentMapDescriptor} compartmentMap
 * @param {LavaMoatPolicyOverrides} [policyOverride]
 * @returns {typeof Compartment}
 * @internal
 */
export const makeGreedyCompartment = (compartmentMap, policyOverride) => {
  if (!policyOverride || !policyOverride.resources) {
    return Compartment
  }

  const resources = policyOverride.resources

  /**
   * We'll use this to assert we don't encounter the entry compartment
   */
  const entryCompartmentName = compartmentMap.entry.compartment

  return class GreedyCompartment extends Compartment {
    /**
     * Creates a "greedy" import hook if we can.
     *
     * @param {CompartmentOptions} [options]
     */
    constructor(options = {}) {
      const { importHook, name } = options

      // the following block may never be executed, but it's here because
      // these properties are not guaranteed to be present in the options, per typings
      /* c8 ignore next */
      if (!importHook || !name) {
        super(options)
        return
      }

      if (!(name in compartmentMap.compartments)) {
        throw new Error(`Unknown compartment: ${name}; this is a bug`)
      }

      const compartmentDescriptor = compartmentMap.compartments[name]

      /** @type {ImportHook} */
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

        for (const [
          moduleDescriptorName,
          { compartment: moduleDescriptorCompartmentName },
        ] of entries(compartmentDescriptor.modules)) {
          /* ci ignore next */
          if (!moduleDescriptorCompartmentName) {
            // The `compartment` prop can be `undefined` per the typings, though
            // I'm not sure if this will ever occur in practice.
            continue
          }

          const moduleDescriptorCompartment =
            compartmentMap.compartments[moduleDescriptorCompartmentName]

          /* c8 ignore next */
          if (!moduleDescriptorCompartment) {
            // This "should never happen". If it does, then the compartment map
            // has become corrupted somehow.
            throw new Error(
              `Missing compartment descriptor for ${moduleDescriptorCompartmentName}; this is a bug`
            )
          }

          // All compartment descriptors will have a module descriptor which
          // refers to itself. We can safely ignore the module descriptor for
          // the current compartment, since we only wish to consider _other_
          // imports.
          if (moduleDescriptorCompartment === compartmentDescriptor) {
            continue
          }

          /* c8 ignore next */
          if (entryCompartmentName === moduleDescriptorCompartmentName) {
            // This also "should never happen", as a foreign compartment should
            // not be importing the entry compartment. Also, the entry
            // compartment cannot have a canonical name, and we need a canonical
            // name to apply policy
            throw new Error(
              'Unexpected entry compartment encountered; this is a bug'
            )
          }

          const canonicalName = getCanonicalName(moduleDescriptorCompartment)

          // We're going to see if the current descriptor is referred to in the
          // policy override's Resources, and add any imports from the policy
          // into the `imports` array of the `ModuleSource`, so that we can
          // potentially _expand_ the policy based on the overrides; the linker
          // will add to the compartment map, which we will later inspect and
          // merge with the existing policy overrides for the resource.
          if (canonicalName in resources) {
            updateModuleSource(moduleDescriptor, moduleDescriptorName)
          }
        }

        return moduleDescriptor
      }

      super({ ...options, importHook: wrappedImportHook })
    }
  }
}
