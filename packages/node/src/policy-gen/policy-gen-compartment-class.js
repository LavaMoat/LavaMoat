/**
 * Provides {@link makePolicyGenCompartment} which is hopefully temporary.
 *
 * @packageDocumentation
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  makeGetOverrideHints,
  makeGetValidCompartmentDescriptor,
} from '../compartment/overrides.js'
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
 * @import {GetValidCompartmentDescriptorFn, MakePolicyGenCompartmentOptions} from '../internal.js'
 * @import {CompartmentDescriptor, CompartmentMapDescriptor} from '@endo/compartment-mapper'
 */

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
 * @param {SourceModuleDescriptor | RecordModuleDescriptor} moduleDescriptor
 *   Module descriptor to update
 * @returns {{
 *   applyHint: (hint: string, newImports?: Set<string>) => void
 *   commit: () => boolean
 * }}
 */
const makeApplyHint = (moduleDescriptor) => {
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

  moduleSource = { ...moduleSource }

  const newImports = new Set(moduleSource.imports)
  const originalImportCount = newImports.size

  /**
   * Append `hint` to the {@link ModuleSource.imports} field within a
   * {@link ModuleDescriptor}.
   *
   * `hint` may be a canonical name or a specifier, depending on whether it came
   * in via resource policy or `hints` proper.
   *
   * **This mutates `moduleDescriptor`** by overwriting its `ModuleSource`
   * object (which could be in either `source` or the deprecated `record` prop).
   * It also overwrites the `ModuleSource.imports` array. Overwritten objects
   * are originally non-extensible (frozen), so we must replace them outright.
   *
   * Once we have overwritten these objects, we should not overwrite them again;
   * instead, mutate them in-place to avoid potentially losing object references
   * elsewhere in `@endo/compartment-mapper`. This is a precautionary measure.
   *
   * @param {string} hint Canonical name, specifier, etc.
   * @returns {void}
   */
  const applyHint = (hint) => {
    if (path.isAbsolute(hint) && moduleDescriptor.importMeta) {
      const { url } = moduleDescriptor.importMeta
      hint = path.relative(fileURLToPath(url), hint)
    }

    newImports.add(hint)
  }

  const commit = () => {
    if (newImports.size > originalImportCount) {
      moduleSource.imports = [...newImports].sort()
      if (isRecordModuleDescriptor(moduleDescriptor)) {
        moduleDescriptor.record = moduleSource
      } else if (isSourceModuleDescriptor(moduleDescriptor)) {
        moduleDescriptor.source = moduleSource
      } else {
        throw new GenerationError(
          `Unsupported module descriptor type; this is a bug`
        )
      }
      return true
    }
    return false
  }

  return { applyHint, commit }
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
 * @param {Map<string, string>} canonicalNameMap
 * @param {MakePolicyGenCompartmentOptions} [options]
 * @returns {typeof Compartment} Either the original `Compartment` or a
 *   `PolicyGenCompartment`
 * @internal
 */
export const makePolicyGenCompartment = (
  compartmentMap,
  canonicalNameMap,
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

  /** @type {Set<string>} */
  const seenCompartmentNames = new Set()

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

        // we only need to do this once per compartment
        if (seenCompartmentNames.has(compartmentName)) {
          return moduleDescriptor
        }

        seenCompartmentNames.add(compartmentName)

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
          canonicalNameMap,
          makeGetValidCompartmentDescriptor(compartmentMap),
          { log, policyOverride }
        )

        const hints = getOverrideHints(compartmentDescriptor)

        if (hints.size === 0) {
          // no hints to apply, so we can return the module descriptor as-is
          return moduleDescriptor
        }

        const { applyHint, commit } = makeApplyHint(moduleDescriptor)

        /** @type {Set<string>} */
        const newImports = new Set()
        // Adds missing imports to the module descriptor from the
        // policy-override.
        for (const hint of hints) {
          applyHint(hint, newImports)
        }

        if (commit()) {
          log.debug(
            `Applied import hints to compartment ${hrLabel(compartmentName)}`
          )
        }

        return moduleDescriptor
      }

      super({ ...options, importHook: wrappedImportHook })
    }
  }

  return PolicyGenCompartment
}
