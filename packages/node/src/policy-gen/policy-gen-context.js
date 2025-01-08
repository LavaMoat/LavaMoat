/**
 * Provides {@link PolicyGeneratorContext}
 *
 * @packageDocumentation
 */

import { isBuiltin as nodeIsBuiltin } from 'node:module'
import { defaultReadPowers } from '../compartment/power.js'
import {
  LMR_TYPE_BUILTIN,
  LMR_TYPE_NATIVE,
  LMR_TYPE_SOURCE,
  NATIVE_PARSER_NAME,
} from '../constants.js'
import { log as fallbackLog } from '../log.js'
import { isString } from '../util.js'
import {
  getPackageName,
  isCompleteModuleDescriptor,
} from './policy-gen-util.js'

/**
 * @import {ReadNowPowers,
 *   CompartmentDescriptor,
 *   ModuleDescriptor,
 *   ModuleSource,
 *   CompartmentSources,
 *   FileURLToPathFn} from '@endo/compartment-mapper'
 * @import {Loggerr} from 'loggerr'
 * @import {LMRCache} from './lmr-cache.js'
 * @import {MissingModuleMap, PolicyGeneratorContextOptions} from '../internal.js'
 * @import {LavamoatModuleRecord, IsBuiltinFn} from 'lavamoat-core'
 */

const { entries, keys, fromEntries } = Object

/**
 * Handles creation of {@link LavamoatModuleRecord} objects for individual
 * compartment descriptors.
 *
 * Can be thought of as a wrapper around a {@link CompartmentDescriptor}.
 *
 * @internal
 */
export class PolicyGeneratorContext {
  /**
   * If `true`, this is the entry compartment
   *
   * @type {boolean}
   */
  #isEntry

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
   * @type {MissingModuleMap | undefined}
   */

  #missingModules

  /** @type {Loggerr} */
  #log

  /**
   * Used for reading source files
   */
  static #decoder = new TextDecoder()

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
   * @param {Readonly<PolicyGeneratorContextOptions>} opts
   */
  constructor(
    compartment,
    renames,
    lmrCache,
    {
      isEntry = false,
      readPowers = defaultReadPowers,
      isBuiltin = nodeIsBuiltin,
      missingModules,
      log = fallbackLog,
    } = {}
  ) {
    this.#isEntry = isEntry
    this.#lmrCache = lmrCache
    this.#readPowers = readPowers
    this.#isBuiltin = isBuiltin
    this.compartment = compartment
    this.renames = renames
    this.#missingModules = missingModules
    this.#log = log
  }

  /**
   * Ensures a specifier is not just a package with the same name as a builtin
   *
   * @param {string} specifier
   */
  isBuiltin(specifier) {
    return (
      !(specifier in this.compartment.modules) && this.#isBuiltin(specifier)
    )
  }

  /**
   * Converts a `string` `file://` URL to a path, or an absolute path derived
   * from a given `ModuleDescriptor`
   *
   * @remarks
   * In Endo, the `compartment` is stored as a _string_ `file://` URL; hence the
   * conversion.
   * @param {string | Required<ModuleDescriptor>} descriptorOrLocation
   * @returns {string}
   * @todo There may be a safer way to do this conversion
   */
  toPath(descriptorOrLocation) {
    if (isString(descriptorOrLocation)) {
      return this.#readPowers.fileURLToPath(new URL(descriptorOrLocation))
    }
    const location = this.renames[descriptorOrLocation.compartment]
    if (!location) {
      throw new TypeError(
        `Rename map missing location for compartment "${descriptorOrLocation.compartment}" in compartment ${this.compartment.name}`
      )
    }
    return this.#readPowers.fileURLToPath(
      new URL(descriptorOrLocation.module, location)
    )
  }

  /**
   * Attempts to find the filepath of a specifier
   *
   * Strips trailing slashes from specifiers, since Endo does not store them
   * with trailing slashes
   *
   * @param {string} specifier
   * @returns {string | undefined}
   */
  getFilepath(specifier) {
    specifier = specifier.replace(/\/$/, '')

    const moduleDescriptor = this.compartment.modules[specifier]
    if (isCompleteModuleDescriptor(moduleDescriptor)) {
      // FIXME: why doesn't this type narrow properly?
      return this.toPath(
        /** @type {Required<ModuleDescriptor>} */ (moduleDescriptor)
      )
    }

    if (this.#missingModules) {
      const { label } = this.compartment
      const missingModules = this.#missingModules.get(label) ?? new Set()
      missingModules.add(specifier)
      this.#missingModules.set(label, missingModules)
    } else {
      this.#log.warning(
        `Missing module descriptor for specifier "${specifier}" in compartment "${this.compartment.label}"`
      )
    }
  }

  /**
   * Builds an import map for a {@link LavamoatModuleRecord} from a list of
   * import specifiers.
   *
   * These specifiers can come from either `StaticModuleType` (as found in
   * `Sources`) or `ModuleDescriptor` objects.
   *
   * Relative-path specifiers do not need an import map entry
   *
   * @param {string[]} imports
   * @returns {Record<string, string>}
   */
  buildImportMap(imports = []) {
    return fromEntries(
      imports
        .filter(
          (specifier) =>
            !specifier.startsWith('.') &&
            (this.isBuiltin(specifier) ||
              (!this.isBuiltin(specifier) && this.getFilepath(specifier)))
        )
        .map((specifier) => {
          if (this.isBuiltin(specifier)) {
            return [specifier, specifier]
          }

          const file = this.getFilepath(specifier)

          return /** @type {[specifier: string, file: string]} */ ([
            specifier,
            file,
          ])
        })
    )
  }

  /**
   * Factory to create a new {@link PolicyGeneratorContext}
   *
   * @param {Readonly<CompartmentDescriptor>} compartment
   * @param {Readonly<Record<string, string>>} renames
   * @param {Readonly<LMRCache>} lmrCache
   * @param {Readonly<PolicyGeneratorContextOptions>} opts
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
    return keys(importMap)
      .filter((specifier) => this.isBuiltin(specifier))
      .map((specifier) =>
        this.#lmrCache.get({
          type: LMR_TYPE_BUILTIN,
          file: specifier,
          specifier,
          packageName: getPackageName(this.compartment, this.#isEntry),
        })
      )
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
    if (!('imports' in record)) {
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

    /**
     * The {@link LavamoatModuleRecord.importMap} prop
     *
     * @type {LavamoatModuleRecord['importMap']}
     */
    const importMap = this.buildImportMap(record.imports)

    const lmrs = [
      // because builtins do not have their own compartments, we need to
      // look into the `importMap` and create LMRs for each builtin.
      // we will add the source LMR to this array as the last step
      ...this.buildModuleRecordsFromImportMap(importMap),

      // the LMR for the source module itself
      this.#lmrCache.get({
        specifier: file,
        file,
        packageName: getPackageName(this.compartment, this.#isEntry),
        importMap,
        content,
        type: parser === NATIVE_PARSER_NAME ? LMR_TYPE_NATIVE : LMR_TYPE_SOURCE,
      }),
    ]

    return lmrs
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
