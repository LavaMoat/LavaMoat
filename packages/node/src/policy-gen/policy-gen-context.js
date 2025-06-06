/**
 * Provides {@link PolicyGeneratorContext}
 *
 * @packageDocumentation
 */
import { colors, defaultLog } from '@lavamoat/vog'
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

/**
 * @import {ReadNowPowers,
 *   CompartmentDescriptor,
 *   ModuleDescriptor,
 *   ModuleSource as ModuleSourceWrapper,
 *   CompartmentSources,
 *   FileURLToPathFn} from '@endo/compartment-mapper'
 * @import {StaticModuleType, ModuleSource} from 'ses'
 * @import {LMRCache} from './lmr-cache.js'
 * @import {ModuleResolver, PolicyGeneratorContextOptions,
 * ResolveCompartmentFn,
 * ResolveModuleDescriptorFn,
 *   SimpleLavamoatModuleRecordOptions} from '../internal.js'
 * @import {CanonicalName, CompartmentDescriptorData} from '../types.js'
 * @import {LavamoatModuleRecord, IsBuiltinFn} from 'lavamoat-core'
 * @import {Logger} from '@lavamoat/vog'
 */

const { entries, keys, hasOwn, freeze } = Object

/**
 * @param {StaticModuleType} value
 * @returns {value is ModuleSource}
 */
const isModuleSource = (value) =>
  hasOwn(value, 'imports') && hasOwn(value, 'exports')

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
  compartmentDescriptor

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

  /** @type {Logger} */
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
   * Metadata associated with {@link compartmentDescriptor}
   *
   * @type {Readonly<CompartmentDescriptorData>}
   */
  #data

  /** @type {ResolveModuleDescriptorFn} */
  #resolveModuleDescriptor

  /**
   * @type {ResolveCompartmentFn}
   */
  #resolveCompartment
  /**
   * Sets some properties
   *
   * @remarks
   * A class w/ a private constructor is essentially "final" and may only be
   * instantiated via a
   * {@link PolicyGeneratorContext.create static factory method} of the same
   * class. This is intentional, since inheritance is undesirable in this case.
   * @private
   * @param {Readonly<CompartmentDescriptor>} compartmentDescriptor The
   *   associated {@link CompartmentDescriptor}
   * @param {Readonly<CompartmentDescriptorData>} data Data associated with the
   *   `CompartmentDescriptor`
   * @param {ModuleResolver} moduleResolver
   * @param {Readonly<LMRCache>} lmrCache
   * @param {Readonly<PolicyGeneratorContextOptions<RootModule>>} options
   */
  constructor(
    compartmentDescriptor,
    data,
    { resolveModuleDescriptor, resolveCompartment },
    lmrCache,
    {
      rootModule,
      readPowers = defaultReadPowers,
      isBuiltin = nodeIsBuiltin,
      log = defaultLog,
    } = {}
  ) {
    this.#lmrCache = lmrCache
    this.#readPowers = readPowers
    this.#isBuiltin = isBuiltin
    this.compartmentDescriptor = compartmentDescriptor
    this.#log = log
    this.#rootModule = rootModule
    this.#missingModules = new Set()
    this.#filepaths = new Map()
    this.#data = freeze(data)
    this.#resolveModuleDescriptor = resolveModuleDescriptor
    this.#resolveCompartment = resolveCompartment
  }

  /**
   * Ensures a specifier is not just a package with the same name as a builtin
   *
   * @param {string} specifier
   * @returns {boolean}
   */
  isBuiltin(specifier) {
    return (
      !hasOwn(this.compartmentDescriptor.modules, specifier) &&
      this.#isBuiltin(specifier)
    )
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
      this.compartmentDescriptor,
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
      const filepath = this.#resolveModuleDescriptor(moduleDescriptor)
      if (filepath) {
        filepaths.set(specifier, filepath)
        return filepath
      } else {
        log.error(
          `Compartment ${hrLabel(this.canonicalName)}: unable to determine filepath for "${specifier}"; this is a bug`
        )
      }
    }

    log.debug(
      `Compartment ${hrLabel(this.canonicalName)}: recording module specified as ${hrPath(specifier)} as missing`
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
   * @param {Readonly<CompartmentDescriptor>} compartmentDescriptor
   * @param {Readonly<CompartmentDescriptorData>} data
   * @param {ModuleResolver} moduleResolver
   * @param {Readonly<LMRCache>} lmrCache
   * @param {Readonly<PolicyGeneratorContextOptions<RootModule>>} options
   * @returns {PolicyGeneratorContext<RootModule>}
   */
  static create(
    compartmentDescriptor,
    data,
    moduleResolver,
    lmrCache,
    options = {}
  ) {
    return new PolicyGeneratorContext(
      compartmentDescriptor,
      data,
      moduleResolver,
      lmrCache,
      options
    )
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
   * @param {ModuleSourceWrapper} source
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
    if (!isModuleSource(record)) {
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
    const importMap = this.buildImportMap(record.imports)

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
    return this.#data.canonicalName
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
      const nicePath = hrPath(
        `${this.#resolveCompartment(this.compartmentDescriptor.location)}`
      )
      let msg = `Package ${hrLabel(this.canonicalName)} (${nicePath}) references unresolvable module(s). This may be due to the module(s) not being installed, "optional" dependencies, or implcit dependencies unreferenced in ${hrPath(PACKAGE_JSON)}. ${colors.italic('Execution will most likely fail')} unless accounted for in policy overrides:`
      for (const missingModule of this.#missingModules) {
        msg += `\n- ${colors.yellow(missingModule)}`
      }
      this.#log.warn(msg)
    }

    return records
  }
}
