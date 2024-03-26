/**
 * Provides {@link PolicyGeneratorContext}
 *
 * @packageDocumentation
 */

import { isBuiltin as nodeIsBuiltin } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ENDO_PARSER_BYTES,
  LAVAMOAT_PKG_POLICY_ROOT,
  LMR_TYPE_BUILTIN,
  LMR_TYPE_NATIVE,
  LMR_TYPE_SOURCE,
} from '../constants.js'
import { defaultReadPowers } from '../power.js'

const { entries, keys, fromEntries } = Object

/**
 * Handles creation of {@link LavamoatModuleRecord} objects for individual
 * compartment descriptors.
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
   * @type {Readonly<import('./lmr-cache.js').LMRCache>}
   */
  #lmrCache
  /**
   * Read powers
   *
   * @type {import('@endo/compartment-mapper').ReadPowers}
   */
  #readPowers

  /**
   * Compartment descriptor
   *
   * @remarks
   * Exposed for debugging
   * @type {Readonly<
   *   import('@endo/compartment-mapper').CompartmentDescriptor
   * >}
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
   * @param {Readonly<
   *   import('@endo/compartment-mapper').CompartmentDescriptor
   * >} compartment
   * @param {Readonly<Record<string, string>>} renames
   * @param {Readonly<import('./lmr-cache.js').LMRCache>} lmrCache
   * @param {Readonly<import('./types.js').PolicyGeneratorContextOptions>} opts
   */
  constructor(
    compartment,
    renames,
    lmrCache,
    { readPowers = defaultReadPowers, isEntry = false } = {}
  ) {
    this.#readPowers = readPowers
    this.#isEntry = isEntry
    this.#lmrCache = lmrCache
    this.compartment = compartment
    this.renames = renames
  }

  /**
   * The package name which will appear in the source's `LavamoatModuleRecord`
   * and eventual policy
   */
  get packageName() {
    return this.#isEntry ? LAVAMOAT_PKG_POLICY_ROOT : this.compartment.name
  }

  /**
   * Ensures a specifier is not just a package with the same name as a builtin
   *
   * @param {string} specifier
   */
  isBuiltin(specifier) {
    return !(specifier in this.compartment.modules) && nodeIsBuiltin(specifier)
  }

  /**
   * A `ModuleDescriptor` has a compartment and module, which can be joined to
   * form an absolute path.
   *
   * @overload
   * @param {Required<import('@endo/compartment-mapper').ModuleDescriptor>} descriptor
   * @returns {string}
   * @internal
   * @todo Evaluate windows compat
   */

  /**
   * Converts a `string` `file://` URL to a path
   *
   * @overload
   * @param {string} location
   * @returns {string}
   * @internal
   */

  /**
   * @remarks
   * In Endo, the `compartment` is stored as a _string_ `file://` URL; hence the
   * conversion.
   * @param {string
   *   | Required<import('@endo/compartment-mapper').ModuleDescriptor>} descriptorOrLocation
   * @returns {string}
   * @internal
   * @todo There may be a safer way to do this conversion
   */
  toPath(descriptorOrLocation) {
    if (typeof descriptorOrLocation === 'string') {
      return fileURLToPath(new URL(descriptorOrLocation))
    }
    const location = this.renames[descriptorOrLocation.compartment]
    if (!location) {
      throw new TypeError(
        `Rename map missing location for compartment "${descriptorOrLocation.compartment}" in compartment ${this.compartment.name}`
      )
    }
    return fileURLToPath(
      new URL(path.join(location, descriptorOrLocation.module))
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
   * @internal
   */
  getFilepath(specifier) {
    specifier = specifier.replace(/\/$/, '')

    const moduleDescriptor = this.compartment.modules[specifier]
    if (PolicyGeneratorContext.isCompleteModuleDescriptor(moduleDescriptor)) {
      return this.toPath(moduleDescriptor)
    }

    return undefined
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
   * @internal
   */
  buildImportMap(imports = []) {
    return fromEntries(
      imports
        .filter((specifier) => !specifier.startsWith('.'))
        .map((specifier) => {
          if (this.isBuiltin(specifier)) {
            return [specifier, specifier]
          }

          /** @type {string | undefined} */
          let file = this.getFilepath(specifier)

          if (!file) {
            throw new ReferenceError(
              `Cannot find file for specifier "${specifier}" in compartment "${this.compartment.name}"`
            )
          }

          return /** @type {[specifier: string, file: string]} */ ([
            specifier,
            file,
          ])
        })
    )
  }

  /**
   * Type guard for a `Required<ModuleDescriptor>`.
   *
   * The `compartment` and `module` props are optional in the original type, but
   * we need both.
   *
   * @param {unknown} descriptor
   * @returns {descriptor is Required<import('@endo/compartment-mapper').ModuleDescriptor>}
   * @this {void}
   * @internal
   */
  static isCompleteModuleDescriptor(descriptor) {
    return Boolean(
      descriptor &&
        typeof descriptor === 'object' &&
        'compartment' in descriptor &&
        'module' in descriptor
    )
  }

  /**
   * Factory to create a new {@link PolicyGeneratorContext}
   *
   * @param {Readonly<
   *   import('@endo/compartment-mapper').CompartmentDescriptor
   * >} compartment
   * @param {Readonly<Record<string, string>>} renames
   * @param {Readonly<import('./lmr-cache.js').LMRCache>} lmrCache
   * @param {Readonly<import('./types.js').PolicyGeneratorContextOptions>} opts
   */
  static create(compartment, renames, lmrCache, opts = {}) {
    return new PolicyGeneratorContext(compartment, renames, lmrCache, opts)
  }

  /**
   * Given an import map, creates an array of {@link LavamoatModuleRecord}s for
   * each builtin found in there.
   *
   * @param {import('lavamoat-core').LavamoatModuleRecord['importMap']} importMap
   * @returns {import('lavamoat-core').LavamoatModuleRecord[]} Zero or more LMRs
   * @internal
   */
  buildModuleRecordsFromImportMap(importMap) {
    return keys(importMap)
      .filter((specifier) => this.isBuiltin(specifier))
      .map((specifier) =>
        this.#lmrCache.get({
          type: LMR_TYPE_BUILTIN,
          file: specifier,
          specifier,
          packageName: specifier,
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
   * @param {import('@endo/compartment-mapper').ModuleSource} source
   * @returns {Promise<import('lavamoat-core').LavamoatModuleRecord[]>}
   * @internal
   */
  async buildModuleRecordsForSource(
    specifier,
    { parser, record, sourceLocation }
  ) {
    if (!sourceLocation) {
      // XXX: why would we not have a sourceLocation?
      throw new TypeError(
        `Source descriptor "${specifier}" missing "sourceLocation" prop in compartment "${this.compartment.name}"`
      )
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

    /**
     * The `ModuleSource.content` prop is already pre-processed by Endo, and we
     * do not want that, since it befouls our AST crawling.
     *
     * This will not be run if the `parser` is `bytes`.
     *
     * @remarks
     * Doing this first since it may be more likely to fail than the other
     * operations below.
     * @type {string | undefined}
     * @todo Modify Endo to surface the original source
     *
     * @todo Add more exceptions to the parsers?
     */
    let content

    await Promise.resolve()
    if (parser !== ENDO_PARSER_BYTES) {
      content = await this.#readPowers
        .read(sourceLocation)
        .then((buffer) => PolicyGeneratorContext.#decoder.decode(buffer))
    }

    /**
     * The {@link LavamoatModuleRecord.file} prop
     *
     * @type {import('lavamoat-core').LavamoatModuleRecord['file']}
     */
    const file = fileURLToPath(new URL(sourceLocation))

    /**
     * The {@link LavamoatModuleRecord.importMap} prop
     *
     * @type {import('lavamoat-core').LavamoatModuleRecord['importMap']}
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
        packageName: this.packageName,
        importMap,
        content,
        type: parser === ENDO_PARSER_BYTES ? LMR_TYPE_NATIVE : LMR_TYPE_SOURCE,
      }),
    ]

    return lmrs
  }

  /**
   * Creates {@link LavamoatModuleRecord}s from CompartmentSources.
   *
   * @param {import('@endo/compartment-mapper').CompartmentSources} sources
   * @returns {Promise<import('lavamoat-core').LavamoatModuleRecord[]>}
   */
  async buildModuleRecords(sources) {
    const lmrs = await Promise.all(
      entries(sources).map((entry) =>
        this.buildModuleRecordsForSource(...entry)
      )
    )
    return lmrs.flat()
  }
}
