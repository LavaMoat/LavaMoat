/**
 * Provides {@link PolicyGeneratorContext}
 *
 * @packageDocumentation
 */

import { isBuiltin as nodeIsBuiltin } from 'node:module'
import { defaultReadPowers } from '../compartment/power.js'
import {
  DEFAULT_TRUST_ENTRYPOINT,
  LAVAMOAT_PKG_POLICY_ROOT,
  LMR_TYPE_BUILTIN,
  LMR_TYPE_NATIVE,
  LMR_TYPE_SOURCE,
  NATIVE_PARSER_NAME,
} from '../constants.js'
import { log as fallbackLog } from '../log.js'
import { hasValue } from '../util.js'

/**
 * @import {ReadNowPowers,
 *   CompartmentDescriptor,
 *   ModuleDescriptor,
 *   ModuleSource,
 *   CompartmentSources,
 *   FileURLToPathFn} from '@endo/compartment-mapper'
 * @import {VirtualModuleSource} from 'ses'
 * @import {LiteralUnion} from 'type-fest'
 * @import {Loggerr} from 'loggerr'
 * @import {LMRCache} from './lmr-cache.js'
 * @import {MissingModuleMap,
 *   PolicyGeneratorContextOptions,
 *   SimpleLavamoatModuleRecordOptions} from '../internal.js'
 * @import {LavamoatModuleRecord, IsBuiltinFn} from 'lavamoat-core'
 */

const { entries, keys, hasOwn } = Object

/**
 * Anything matching this is a specifier within some non-relative package. e.g.,
 * `@foo/bar/baz.js`, `foo/baz.js`
 */
const SUBPATH_REGEX = /^(?:@(?:.+?\/){2,}|^[^@.].*\/).+$/

/**
 * Handles creation of {@link LavamoatModuleRecord} objects for individual
 * compartment descriptors.
 *
 * Can be thought of as a wrapper around a {@link CompartmentDescriptor}.
 *
 * @template {string | void} [RootModule=void] Default is `void`
 * @internal
 */
export class PolicyGeneratorContext {
  /**
   * If `true`, this is the entry compartment
   *
   * @type {Readonly<boolean>}
   */
  #isRootCompartment

  /**
   * Internal cache for {@link LavamoatModuleRecord} objects
   *
   * @type {Readonly<LMRCache>}
   */
  #lmrCache

  /**
   * Compartment descriptor
   *
   * @remarks
   * Exposed for debugging
   * @type {Readonly<CompartmentDescriptor>}
   * @internal
   */
  compartment

  /**
   * Mapping of renamed compartments
   *
   * @remarks
   * Exposed for debugging
   * @type {Readonly<Record<string, string>>}
   * @internal
   */
  renames

  /**
   * Read powers
   *
   * Specifically, we need a {@link FileURLToPathFn}
   *
   * @type {ReadNowPowers}
   */
  #readPowers

  /**
   * An {@link IsBuiltinFn}
   */
  #isBuiltin

  /**
   * A mapping of compartment names to missing module specifiers encountered
   * during the policy generation process.
   *
   * @type {Readonly<MissingModuleMap>}
   */

  #missingModules

  /** @type {Readonly<Loggerr>} */
  #log

  /**
   * Used for reading source files
   */
  static #decoder = new TextDecoder()

  /**
   * Cache of specifier to filepath (or lack thereof)
   *
   * `null` is used to differentiate the value if the specifier has no filepath
   * vs. if it is actually absent from the `Map` (as in the case of a builtin).
   *
   * @type {Readonly<Map<string, string | null | undefined>>}
   */

  #filepaths = new Map()

  /** @type {Readonly<boolean>} */
  #trustEntrypoint

  /**
   * @type {RootModule | undefined}
   */
  #entrypoint

  /**
   * Sets some properties
   *
   * @remarks
   * A class w/ a private constructor is essentially "final" and may only be
   * instantiated via a
   * {@link PolicyGeneratorContext.create static factory method} of the same
   * class. This is intentional, since inheritance is undesirable in this case.
   * @private
   * @param {Readonly<CompartmentDescriptor>} compartment
   * @param {Readonly<Record<string, string>>} renames
   * @param {Readonly<LMRCache>} lmrCache
   * @param {Readonly<PolicyGeneratorContextOptions<RootModule>>} opts
   */
  constructor(
    compartment,
    renames,
    lmrCache,
    {
      rootModule: entrypoint,
      readPowers = defaultReadPowers,
      isBuiltin = nodeIsBuiltin,
      missingModules = new Map(),
      log = fallbackLog,
      trustEntrypoint = DEFAULT_TRUST_ENTRYPOINT,
    } = {}
  ) {
    this.#isRootCompartment = !!entrypoint
    this.#lmrCache = lmrCache
    this.#readPowers = readPowers
    this.#isBuiltin = isBuiltin
    this.compartment = compartment
    this.renames = renames
    this.#missingModules = missingModules
    this.#log = log
    this.#trustEntrypoint = trustEntrypoint
    this.#entrypoint = entrypoint
  }

  /**
   * Ensures a specifier is not just a package with the same name as a builtin
   *
   * @param {string} specifier
   * @returns {boolean}
   */
  isBuiltin(specifier) {
    return (
      !hasOwn(this.compartment.modules, specifier) && this.#isBuiltin(specifier)
    )
  }

  /**
   * Converts a `string` `file://` URL to a path, or an absolute path derived
   * from a given `ModuleDescriptor`
   *
   * @remarks
   * In Endo, the `compartment` is stored as a _string_ `file://` URL; hence the
   * conversion.
   * @param {ModuleDescriptor} descriptor Module descriptor
   * @returns {string | undefined}
   * @todo There may be a safer way to do this conversion
   */
  toPath(descriptor) {
    // it might have a `compartment` and `module`
    if (hasValue(descriptor, 'compartment') && hasValue(descriptor, 'module')) {
      const location = this.renames[descriptor.compartment]
      if (!location) {
        throw new TypeError(
          `Rename map missing location for compartment "${descriptor.compartment}" in compartment ${this.compartment.name}`
        )
      }
      return this.#readPowers.fileURLToPath(
        new URL(descriptor.module, location)
      )
    }
    // it might have `location` instead
    if (hasValue(descriptor, 'location')) {
      return this.#readPowers.fileURLToPath(
        new URL(descriptor.location, this.renames[this.compartment.location])
      )
    }
    // can't find it!
  }

  /**
   * Returns `true` if `specifier` should have an entry in a
   * {@link LavamoatModuleRecord.importMap}.
   *
   * @param {string} specifier
   * @returns {boolean}
   */
  wantsImportMap(specifier) {
    return this.isBuiltin(specifier) || SUBPATH_REGEX.test(specifier)
  }

  /**
   * Attempts to find the filepath of a specifier
   *
   * Strips trailing slashes from specifiers, since Endo does not store them
   * with trailing slashes
   *
   * @param {string} specifier
   * @returns {string | null} Filepath, name of builtin, or if `null`, then the
   *   module is missing.
   */
  getFilepath(specifier) {
    specifier = specifier.replace(/\/$/, '')

    if (this.#filepaths.has(specifier)) {
      return /** @type {string | null} */ (this.#filepaths.get(specifier))
    }

    if (this.isBuiltin(specifier)) {
      this.#filepaths.set(specifier, specifier)
      return specifier
    }

    const moduleDescriptor = this.compartment.modules[specifier]
    if (moduleDescriptor) {
      const filepath = this.toPath(moduleDescriptor)
      if (filepath) {
        this.#filepaths.set(specifier, filepath)
        return filepath
      }
    }

    const { label } = this.compartment
    const missingModules = this.#missingModules.get(label) ?? new Set()
    missingModules.add(specifier)
    this.#missingModules.set(label, missingModules)

    this.#filepaths.set(specifier, null)
    return null
  }

  /**
   * Builds an import map for a {@link LavamoatModuleRecord} from a list of
   * import specifiers.
   *
   * These specifiers can come from either `StaticModuleType` (as found in
   * `Sources`) or `ModuleDescriptor` objects.
   *
   * Relative-path specifiers do not need an import map entry.
   *
   * @param {string[]} imports
   * @returns {LavamoatModuleRecord['importMap']}
   */
  buildImportMap(imports = []) {
    return imports.reduce((acc, specifier) => {
      if (this.wantsImportMap(specifier)) {
        const filepath = this.getFilepath(specifier)
        if (filepath) {
          acc[specifier] = filepath
        }
      }
      return acc
    }, /** @type {LavamoatModuleRecord['importMap']} */ ({}))
  }

  /**
   * Factory to create a new {@link PolicyGeneratorContext}
   *
   * @template {string | void} [RootModule=void] Default is `void`
   * @param {Readonly<CompartmentDescriptor>} compartment
   * @param {Readonly<Record<string, string>>} renames
   * @param {Readonly<LMRCache>} lmrCache
   * @param {Readonly<PolicyGeneratorContextOptions<RootModule>>} opts
   * @returns {PolicyGeneratorContext<RootModule>}
   */
  static create(compartment, renames, lmrCache, opts = {}) {
    return new PolicyGeneratorContext(compartment, renames, lmrCache, opts)
  }

  /**
   * Given an import map, creates an array of {@link LavamoatModuleRecord}s for
   * each builtin found in there.
   *
   * @param {LavamoatModuleRecord['importMap']} importMap
   * @returns {LavamoatModuleRecord[]} Zero or more LMRs
   */
  buildModuleRecordsFromImportMap(importMap) {
    return keys(importMap).reduce((acc, specifier) => {
      if (this.isBuiltin(specifier)) {
        /** @type {SimpleLavamoatModuleRecordOptions} */
        const lmrOpts = {
          type: LMR_TYPE_BUILTIN,
          file: specifier,
          specifier,
          packageName: this.packageName,
        }
        if (!this.#lmrCache.has(lmrOpts)) {
          this.#lmrCache.add(lmrOpts)
        }
        acc.push(
          /** @type {LavamoatModuleRecord} */ (this.#lmrCache.get(lmrOpts))
        )
      }
      return acc
    }, /** @type {LavamoatModuleRecord[]} */ ([]))
  }

  /**
   * Creates one or more {@link LavamoatModuleRecord LavamoatModuleRecords} from
   * a single `ModuleSource`.
   *
   * The resulting array will contain--at minimum--a LMR of the source itself.
   * It will also contain zero (0) or more LMRs for any builtins the module
   * references.
   *
   * @param {string} specifier
   * @param {ModuleSource} source
   * @returns {LavamoatModuleRecord[]}
   */
  buildModuleRecordsForSource(
    specifier,
    { parser, record, sourceLocation, bytes }
  ) {
    if (!sourceLocation) {
      // XXX: under what circumstances does this occur?
      return []
    }

    if (!record) {
      // XXX: under what circumstances does this occur?
      throw new TypeError(
        `Source descriptor "${specifier}" in compartment "${this.compartment.name}" missing prop: record`
      )
    }

    // `record` can be several different types, but for our purposes,
    // we can use `imports` as the discriminator
    if (!hasOwn(record, 'imports')) {
      // XXX: under what circumstances does this occur?
      throw new TypeError(
        `StaticModuleType for source descriptor "${specifier}" in compartment "${this.compartment.name} missing prop: imports`
      )
    }

    const content = PolicyGeneratorContext.#decoder.decode(bytes)

    /**
     * The {@link LavamoatModuleRecord.file} prop
     *
     * @type {LavamoatModuleRecord['file']}
     */
    const file = this.#readPowers.fileURLToPath(new URL(sourceLocation))

    // TODO: add a "trace" loglevel
    // this.#log.debug(`Building module record for "${specifier}" (${file})`)

    /**
     * The {@link LavamoatModuleRecord.importMap} prop
     */
    const importMap = this.buildImportMap(
      /** @type {VirtualModuleSource} */ (record).imports
    )

    // careful with the distinction between the root MODULE and the root COMPARTMENT
    const isRoot = this.isRootModule(file)

    /** @type {SimpleLavamoatModuleRecordOptions} */
    const lmrOptions = {
      specifier: file,
      file,
      packageName: this.packageName,
      importMap,
      content,
      type: parser === NATIVE_PARSER_NAME ? LMR_TYPE_NATIVE : LMR_TYPE_SOURCE,
      isRoot,
    }

    if (isRoot) {
      this.#log.debug(`Found root module: ${file}`)
    }

    if (!this.#lmrCache.has(lmrOptions)) {
      this.#lmrCache.add(lmrOptions)
    }

    // because builtins do not have their own compartments, we need to
    // look into the `importMap` and create LMRs for each builtin.
    // we will add the source LMR to this array as the last step
    return [
      ...this.buildModuleRecordsFromImportMap(importMap),
      /** @type {LavamoatModuleRecord} */ (this.#lmrCache.get(lmrOptions)),
    ]
  }

  /**
   * Returns `true` if this module is the entrypoint
   *
   * @param {string} filepath
   * @returns {filepath is RootModule}
   */
  isRootModule(filepath) {
    return this.#isRootCompartment && filepath === this.#entrypoint
  }

  /**
   * Determine the package name for this context's compartment descriptor
   *
   * @returns {LiteralUnion<typeof LAVAMOAT_PKG_POLICY_ROOT, string>} Package
   *   name or special name for entrypoint
   */
  get packageName() {
    return this.#isRootCompartment && this.#trustEntrypoint
      ? LAVAMOAT_PKG_POLICY_ROOT
      : this.compartment.name
  }

  /**
   * Creates {@link LavamoatModuleRecord}s from {@link CompartmentSources}.
   *
   * @param {CompartmentSources} sources
   * @returns {LavamoatModuleRecord[]}
   */
  buildModuleRecords(sources) {
    return entries(sources).flatMap((entry) =>
      this.buildModuleRecordsForSource(...entry)
    )
  }
}
