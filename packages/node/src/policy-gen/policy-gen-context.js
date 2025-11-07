/**
 * Provides {@link PolicyGeneratorContext}
 *
 * @packageDocumentation
 */
import chalk from 'chalk'
import { isBuiltin as nodeIsBuiltin } from 'node:module'
import { defaultReadPowers } from '../compartment/power.js'
import {
  LMR_TYPE_BUILTIN,
  LMR_TYPE_NATIVE,
  LMR_TYPE_SOURCE,
  NATIVE_PARSER_NAME,
  PACKAGE_JSON,
} from '../constants.js'
import { GenerationError } from '../error.js'
import { hrLabel, hrPath } from '../format.js'
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
 * @import {Loggerr} from 'loggerr'
 * @import {LMRCache} from './lmr-cache.js'
 * @import {CanonicalName, PolicyGeneratorContextOptions,
 *   SimpleLavamoatModuleRecordOptions} from '../internal.js'
 * @import {LavamoatModuleRecord, IsBuiltinFn} from 'lavamoat-core'
 */

const { entries, keys, hasOwn } = Object

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
   * @type {Readonly<Set<string>>}
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
   * - A value of `null` is used when the specifier has no filepath
   * - A value of `undefined` is used if the specifier is absent from the `Map`
   *   (as in the case of a builtin)
   *
   * @type {Readonly<Map<string, string | null | undefined>>}
   */

  #filepaths

  /**
   * @type {RootModule | undefined}
   */
  #rootModule

  /**
   * Sets some properties
   *
   * @remarks
   * A class w/ a private constructor is essentially "final" and may only be
   * instantiated via a
   * {@link PolicyGeneratorContext.create static factory method} of the same
   * class. This is intentional, since inheritance is undesirable in this case.
   * @private
   * @param {Readonly<CompartmentDescriptor>} compartment The associated
   *   compartment
   * @param {Readonly<Record<string, string>>} renames
   * @param {Readonly<LMRCache>} lmrCache
   * @param {Readonly<PolicyGeneratorContextOptions<RootModule>>} opts
   */
  constructor(
    compartment,
    renames,
    lmrCache,
    {
      rootModule,
      readPowers = defaultReadPowers,
      isBuiltin = nodeIsBuiltin,
      log = fallbackLog,
    } = {}
  ) {
    this.#lmrCache = lmrCache
    this.#readPowers = readPowers
    this.#isBuiltin = isBuiltin
    this.compartment = compartment
    this.renames = renames
    this.#log = log
    this.#rootModule = rootModule
    this.#missingModules = new Set()
    this.#filepaths = new Map()
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
        throw new GenerationError(
          `Compartment ${hrLabel(this.canonicalName)}: Rename map missing location for referenced compartment ${hrPath(descriptor.compartment)}`
        )
      }
      return this.#readPowers.fileURLToPath(
        new URL(descriptor.module, location)
      )
    }
  }

  /**
   * Attempts to resolve the filepath of `specifier` using the current
   * compartment descriptor's
   * {@link CompartmentDescriptor.modules module descriptors}.
   *
   * Strips trailing slashes from specifiers, since Endo does not store them
   * with trailing slashes
   *
   * @param {string} specifier
   * @returns {string | null} Filepath, name of builtin, or if `null`, then
   *   either the module is missing or we just don't need an import map entry
   *   for it.
   */
  resolveSpecifier(specifier) {
    const [filepaths, log, compartment] = [
      this.#filepaths,
      this.#log,
      this.compartment,
    ]
    specifier = specifier.replace(/\/$/, '')

    if (filepaths.has(specifier)) {
      const cachedFilepath = /** @type {string | null} */ (
        filepaths.get(specifier)
      )
      return cachedFilepath
    }

    if (specifier.startsWith('./') || specifier.startsWith('../')) {
      // relative path
      filepaths.set(specifier, null)
      return null
    }
    if (this.isBuiltin(specifier)) {
      filepaths.set(specifier, specifier)
      return specifier
    }

    /** @type {ModuleDescriptor | undefined} */
    const moduleDescriptor = compartment.modules[specifier]

    if (moduleDescriptor) {
      const filepath = this.toPath(moduleDescriptor)
      if (filepath) {
        filepaths.set(specifier, filepath)
        return filepath
      } else {
        log.error(
          `Compartment ${hrLabel(compartment.label)}: unable to determine filepath for "${specifier}"; this is a bug`
        )
      }
    }

    log.debug(
      `Compartment ${hrLabel(compartment.label)}: recording module specified as ${hrPath(specifier)} as missing`
    )
    this.#missingModules.add(specifier)
    filepaths.set(specifier, null)

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
      const filepath = this.resolveSpecifier(specifier)
      if (filepath) {
        acc[specifier] = filepath
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
  buildModuleRecordsFromImportedBuiltins(importMap) {
    return keys(importMap).reduce((acc, specifier) => {
      if (this.isBuiltin(specifier)) {
        /** @type {SimpleLavamoatModuleRecordOptions} */
        const lmrOpts = {
          type: LMR_TYPE_BUILTIN,
          file: specifier,
          specifier,
          packageName: specifier,
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
      throw new GenerationError(
        `Source descriptor "${specifier}" in compartment "${this.canonicalName}" missing prop: record`
      )
    }

    // `record` can be several different types, but for our purposes,
    // we can use `imports` as the discriminator
    if (!hasOwn(record, 'imports')) {
      // XXX: under what circumstances does this occur?
      throw new GenerationError(
        `StaticModuleType for source descriptor "${specifier}" in compartment "${this.canonicalName} missing prop: imports`
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
    const isRoot = file === this.#rootModule

    /** @type {SimpleLavamoatModuleRecordOptions} */
    const lmrOptions = {
      specifier: file,
      file,
      packageName: this.canonicalName,
      importMap,
      content,
      type: parser === NATIVE_PARSER_NAME ? LMR_TYPE_NATIVE : LMR_TYPE_SOURCE,
      isRoot,
    }

    if (isRoot) {
      this.#log.debug(`Found root module: ${hrPath(file)}`)
    }

    if (!this.#lmrCache.has(lmrOptions)) {
      this.#lmrCache.add(lmrOptions)
    }

    // because builtins do not have their own compartments, we need to
    // look into the `importMap` and create LMRs for each builtin.
    // we will add the source LMR to this array as the last step
    return [
      ...this.buildModuleRecordsFromImportedBuiltins(importMap),
      /** @type {LavamoatModuleRecord} */ (this.#lmrCache.get(lmrOptions)),
    ]
  }

  /**
   * Determine the canonical name for this context's compartment descriptor
   *
   * @returns {CanonicalName} Package name or special name for entrypoint
   */
  get canonicalName() {
    return this.compartment.label
  }

  /**
   * Creates {@link LavamoatModuleRecord}s from {@link CompartmentSources}.
   *
   * @param {CompartmentSources} sources
   * @returns {LavamoatModuleRecord[]}
   */
  buildModuleRecords(sources) {
    const records = entries(sources).flatMap((entry) =>
      this.buildModuleRecordsForSource(...entry)
    )

    if (this.#missingModules.size) {
      const nicePath = hrPath(this.renames[this.compartment.location])
      let msg = `Ensure all dependencies are properly installed. Package ${hrLabel(this.canonicalName)} (${nicePath}) references unresolvable module(s). Unresolvable modules may be "optional" or otherwise unlisted in ${hrPath(PACKAGE_JSON)}. ${chalk.italic('Execution will most likely fail')} unless accounted for in policy overrides:`
      for (const missingModule of this.#missingModules) {
        msg += `\n- ${chalk.yellow(missingModule)}`
      }
      this.#log.warning(msg)
    }

    return records
  }
}
