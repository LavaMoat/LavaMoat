import { createModuleInspector } from 'lavamoat-core'
import { isBuiltin as nodeIsBuiltin } from 'node:module'
import { defaultReadPowers } from '../power.js'
import { LMRCache } from './lmr-cache.js'
import { PolicyGeneratorContext } from './policy-generator-context.js'

const { entries, freeze } = Object

/**
 * @import {Sources, CompartmentMapDescriptor} from '@endo/compartment-mapper'
 * @import {LavaMoatPolicy, LavaMoatPolicyDebug, LavaMoatPolicyOverrides, LavamoatModuleRecord, ModuleInspector} from 'lavamoat-core'
 * @import {PolicyGeneratorOptions} from '../types.js'
 */

/**
 * Service which generates a LavaMoat policy from compartment map descriptors
 * and sources
 *
 * @internal
 */
export class PolicyGenerator {
  /**
   * Cache of `LavamoatModuleRecord` objects
   *
   * @type {Readonly<LMRCache>}
   */
  #lmrCache

  /**
   * Mapping of compartment names to {@link PolicyGeneratorContext} instances
   *
   * @type {Readonly<Map<string, PolicyGeneratorContext>>}
   */
  #contexts

  /**
   * Compartment sources
   *
   * @remarks
   * Exposed for debugging
   * @type {Readonly<Sources>}
   * @internal
   */
  sources

  /**
   * Compartment map
   *
   * @remarks
   * Exposed for debugging
   * @type {Readonly<CompartmentMapDescriptor>}
   * @internal
   */
  compartmentMap

  /**
   * Override policy, if any
   *
   * @remarks
   * Exposed for debugging
   * @type {Readonly<LavaMoatPolicyOverrides | undefined>}
   * @internal
   */
  policyOverride

  /**
   * Creates {@link PolicyGeneratorContext} instances for each compartment in
   * `compartmentMap`.
   *
   * @remarks
   * A class w/ a private constructor is essentially "final" and may only be
   * instantiated via a {@link PolicyGenerator.create static factory method} of
   * the same class. This is intentional, since inheritance is undesirable in
   * this case.
   * @private
   * @param {CompartmentMapDescriptor} compartmentMap Compartment map descriptor
   * @param {Sources} sources Sources
   * @param {Record<string, string>} renames Mapping of compartment name to
   *   filepath
   * @param {PolicyGeneratorOptions} opts Additional options
   */
  constructor(
    compartmentMap,
    sources,
    renames,
    { readPowers = defaultReadPowers, policyOverride } = {}
  ) {
    this.sources = freeze(sources)
    this.compartmentMap = freeze(compartmentMap)
    this.policyOverride = freeze(policyOverride)
    this.#lmrCache = new LMRCache()

    const entryCompartment =
      compartmentMap.compartments[compartmentMap.entry.compartment]

    if (!entryCompartment) {
      throw new TypeError('Could not find entry compartment; this is a bug')
    }

    this.#contexts = new Map(
      entries(compartmentMap.compartments).map(
        ([compartmentName, compartment]) => [
          compartmentName,
          PolicyGeneratorContext.create(
            compartment,
            freeze(renames),
            this.#lmrCache,
            {
              isEntry: entryCompartment === compartment,
              readPowers,
            }
          ),
        ]
      )
    )
  }

  /**
   * Builds `LavamoatModuleRecord` objects from the `CompartmentMapDescriptor`
   *
   * @returns {Promise<LavamoatModuleRecord[]>} Module records
   * @internal
   */
  async buildModuleRecords() {
    await Promise.resolve()

    let moduleRecords = /** @type {LavamoatModuleRecord[]} */ (
      (
        await Promise.all(
          entries(this.sources).map(
            async ([compartmentName, compartmentSources]) => {
              if (!this.#contexts.has(compartmentName)) {
                // this means that the compartment with this name was not actually used
                return
              }

              const context = /** @type {PolicyGeneratorContext} */ (
                this.#contexts.get(compartmentName)
              )

              return context.buildModuleRecords(compartmentSources)
            }
          )
        )
      )
        .flat()
        .filter(Boolean)
    )

    moduleRecords = [...new Set(moduleRecords)]

    this.#lmrCache.clear()

    return moduleRecords
  }

  /**
   * Uses `inspector` to inspect a compartment map and sources.
   *
   * @param {LavamoatModuleRecord[]} moduleRecords Module records
   * @param {boolean} [debug=false] - If `true`, the inspector will include
   *   debug ifnormation. Default is `false`
   * @returns {ModuleInspector} The inspector
   * @internal
   */
  inspectModuleRecords(moduleRecords, debug = false) {
    const inspector = createModuleInspector({
      isBuiltin: nodeIsBuiltin,
      includeDebugInfo: debug,
      allowDynamicRequires: true,
    })

    // FIXME: should we sort here?
    for (const record of moduleRecords) {
      inspector.inspectModule(record)
    }

    return inspector
  }

  /**
   * Generates a LavaMoat debug policy
   *
   * Policy generation occurs in three (3) steps:
   *
   * 1. Build module records from the `CompartmentMapDescriptor` and associated
   *    `Sources`
   * 2. Inspect the module records using LavaMoat's `ModuleInspector`
   * 3. Generate the policy using the `ModuleInspector`
   *
   * @overload
   * @param {true} debug - If `true`, the result will be a debug policy
   * @returns {Promise<LavaMoatPolicyDebug>} Generated policy
   * @internal
   */

  /**
   * Generates a LavaMoat policy
   *
   * Policy generation occurs in three (3) steps:
   *
   * 1. Build module records from the `CompartmentMapDescriptor` and associated
   *    `Sources`
   * 2. Inspect the module records using LavaMoat's `ModuleInspector`
   * 3. Generate the policy using the `ModuleInspector`
   *
   * @overload
   * @param {boolean} [debug] - If `true`, the result will be a debug policy
   * @returns {Promise<LavaMoatPolicy>} Generated policy
   * @internal
   */

  /**
   * Generates a LavaMoat policy or LavaMoat debug policy.
   *
   * Policy generation occurs in three (3) steps:
   *
   * 1. Build module records from the `CompartmentMapDescriptor` and associated
   *    `Sources`
   * 2. Inspect the module records using LavaMoat's `ModuleInspector`
   * 3. Generate the policy using the `ModuleInspector`
   *
   * @param {boolean} [debug=false] - If `true`, the result will be a debug
   *   policy. Default is `false`
   * @returns {Promise<LavaMoatPolicy | LavaMoatPolicyDebug>} Generated policy
   * @internal
   */
  async generatePolicy(debug) {
    const moduleRecords = await this.buildModuleRecords()

    const inspector = this.inspectModuleRecords(moduleRecords, debug)
    return inspector.generatePolicy({
      policyOverride: this.policyOverride,
    })
  }

  /**
   * Instantiates a {@link PolicyGenerator} and generates a debug policy.
   *
   * @overload
   * @param {Readonly<CompartmentMapDescriptor>} compartmentMap
   * @param {Readonly<Sources>} sources
   * @param {Readonly<Record<string, string>>} renames
   * @param {PolicyGeneratorOptions & { debug: true }} options
   * @returns {Promise<LavaMoatPolicyDebug>} Generated debug policy
   * @public
   */

  /**
   * Instantiates a {@link PolicyGenerator} and generates a policy.
   *
   * @overload
   * @param {Readonly<CompartmentMapDescriptor>} compartmentMap
   * @param {Readonly<Sources>} sources
   * @param {Readonly<Record<string, string>>} renames
   * @param {PolicyGeneratorOptions} [options]
   * @returns {Promise<LavaMoatPolicy>} Generated policy
   */

  /**
   * Instantiates a {@link PolicyGenerator} and generates a policy.
   *
   * @param {Readonly<CompartmentMapDescriptor>} compartmentMap
   * @param {Readonly<Sources>} sources
   * @param {Readonly<Record<string, string>>} renames
   * @param {PolicyGeneratorOptions & {
   *   debug?: boolean
   * }} [options]
   * @returns {Promise<LavaMoatPolicy>} Generated policy
   * @public
   */
  static async generatePolicy(compartmentMap, sources, renames, options) {
    const { debug = false, ...policyGeneratorOptions } = options ?? {}
    const generator = PolicyGenerator.create(
      compartmentMap,
      sources,
      renames,
      policyGeneratorOptions
    )
    return generator.generatePolicy(debug)
  }

  /**
   * Factory for {@link PolicyGenerator}
   *
   * @param {CompartmentMapDescriptor} compartmentMap Compartment map descriptor
   * @param {Sources} sources Sources
   * @param {Record<string, string>} renames Mapping of compartment name to
   *   filepath
   * @param {PolicyGeneratorOptions} opts Additional options
   */
  static create(compartmentMap, sources, renames, opts = {}) {
    return new PolicyGenerator(compartmentMap, sources, renames, opts)
  }
}
