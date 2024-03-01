import { createModuleInspector } from 'lavamoat-core'
import { isBuiltin as nodeIsBuiltin } from 'node:module'
import { defaultReadPowers } from '../power.js'
import { LMRCache } from './lmr-cache.js'
import { PolicyGeneratorContext } from './policy-generator-context.js'

const { entries } = Object

/**
 * Service which generates a LavaMoat policy from compartment map descriptors
 * and sources
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
   * @type {Readonly<import('@endo/compartment-mapper').Sources>}
   * @internal
   */
  sources

  /**
   * Compartment map
   *
   * @remarks
   * Exposed for debugging
   * @type {Readonly<
   *   import('@endo/compartment-mapper').CompartmentMapDescriptor
   * >}
   * @internal
   */
  compartmentMap

  /**
   * Override policy, if any
   *
   * @remarks
   * Exposed for debugging
   * @type {Readonly<
   *   import('lavamoat-core').LavaMoatPolicyOverrides | undefined
   * >}
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
   * @param {import('@endo/compartment-mapper').CompartmentMapDescriptor} compartmentMap
   *   Compartment map descriptor
   * @param {import('@endo/compartment-mapper').Sources} sources Sources
   * @param {Record<string, string>} renames Mapping of compartment name to
   *   filepath
   * @param {import('./types.js').PolicyGeneratorOptions} opts Additional
   *   options
   */
  constructor(
    compartmentMap,
    sources,
    renames,
    { readPowers = defaultReadPowers, policyOverride } = {}
  ) {
    this.sources = Object.freeze(sources)
    this.compartmentMap = Object.freeze(compartmentMap)
    this.policyOverride = Object.freeze(policyOverride)
    this.#lmrCache = new LMRCache()

    const entryCompartment =
      compartmentMap.compartments[compartmentMap.entry.compartment]

    if (!entryCompartment) {
      throw new TypeError('Could not find entry compartment; this is a bug')
    }

    const frozenRenames = Object.freeze(renames)

    this.#contexts = new Map(
      entries(compartmentMap.compartments).map(
        ([compartmentName, compartment]) => [
          compartmentName,
          PolicyGeneratorContext.create(
            compartment,
            frozenRenames,
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
   * @returns {Promise<import('lavamoat-core').LavamoatModuleRecord[]>} Module
   *   records
   * @internal
   */
  async buildModuleRecords() {
    await Promise.resolve()

    let moduleRecords =
      /** @type {import('lavamoat-core').LavamoatModuleRecord[]} */ (
        (
          await Promise.all(
            entries(this.sources).map(
              async ([compartmentName, compartmentSources]) => {
                if (!this.#contexts.has(compartmentName)) {
                  // this means that the compartment with this name was not actually used
                  return
                }

                const compartment = /** @type {PolicyGeneratorContext} */ (
                  this.#contexts.get(compartmentName)
                )

                return compartment.buildModuleRecords(compartmentSources)
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
   * @param {import('lavamoat-core').ModuleInspector} inspector Module inspector
   * @param {import('lavamoat-core').LavamoatModuleRecord[]} moduleRecords
   *   Module records
   * @returns {import('lavamoat-core').ModuleInspector} The inspector
   * @internal
   */
  inspectModuleRecords(inspector, moduleRecords) {
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
   * @returns {Promise<import('lavamoat-core').LavaMoatPolicyDebug>} Generated
   *   policy
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
   * @returns {Promise<import('lavamoat-core').LavaMoatPolicy>} Generated policy
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
   * @param {boolean} [debug] - If `true`, the result will be a debug policy
   * @returns {Promise<
   *   | import('lavamoat-core').LavaMoatPolicy
   *   | import('lavamoat-core').LavaMoatPolicyDebug
   * >}
   *   Generated policy
   * @internal
   */
  async generatePolicy(debug) {
    const moduleRecords = await this.buildModuleRecords()

    const inspector = createModuleInspector({
      isBuiltin: nodeIsBuiltin,
      includeDebugInfo: debug,
    })

    return this.inspectModuleRecords(inspector, moduleRecords).generatePolicy({
      policyOverride: this.policyOverride,
    })
  }

  /**
   * Instantiates a {@link PolicyGenerator} and generates a debug policy.
   *
   * @overload
   * @param {Readonly<
   *   import('@endo/compartment-mapper').CompartmentMapDescriptor
   * >} compartmentMap
   * @param {Readonly<import('@endo/compartment-mapper').Sources>} sources
   * @param {Readonly<Record<string, string>>} renames
   * @param {import('./types.js').PolicyGeneratorOptions & { debug: true }} opts
   * @returns {Promise<import('lavamoat-core').LavaMoatPolicyDebug>} Generated
   *   debug policy
   * @public
   */

  /**
   * Instantiates a {@link PolicyGenerator} and generates a policy.
   *
   * @overload
   * @param {Readonly<
   *   import('@endo/compartment-mapper').CompartmentMapDescriptor
   * >} compartmentMap
   * @param {Readonly<import('@endo/compartment-mapper').Sources>} sources
   * @param {Readonly<Record<string, string>>} renames
   * @param {import('./types.js').PolicyGeneratorOptions} [opts]
   * @returns {Promise<import('lavamoat-core').LavaMoatPolicy>} Generated policy
   */

  /**
   * Instantiates a {@link PolicyGenerator} and generates a policy.
   *
   * @param {Readonly<
   *   import('@endo/compartment-mapper').CompartmentMapDescriptor
   * >} compartmentMap
   * @param {Readonly<import('@endo/compartment-mapper').Sources>} sources
   * @param {Readonly<Record<string, string>>} renames
   * @param {import('./types.js').PolicyGeneratorOptions & {
   *   debug?: boolean
   * }} [opts]
   * @returns {Promise<import('lavamoat-core').LavaMoatPolicy>} Generated policy
   * @public
   */
  static async generatePolicy(compartmentMap, sources, renames, opts) {
    const { debug, ...restOpts } = opts ?? {}
    const generator = PolicyGenerator.create(
      compartmentMap,
      sources,
      renames,
      restOpts
    )
    return generator.generatePolicy(debug)
  }

  /**
   * Factory for {@link PolicyGenerator}
   *
   * @param {import('@endo/compartment-mapper').CompartmentMapDescriptor} compartmentMap
   *   Compartment map descriptor
   * @param {import('@endo/compartment-mapper').Sources} sources Sources
   * @param {Record<string, string>} renames Mapping of compartment name to
   *   filepath
   * @param {import('./types.js').PolicyGeneratorOptions} opts Additional
   *   options
   */
  static create(compartmentMap, sources, renames, opts = {}) {
    return new PolicyGenerator(compartmentMap, sources, renames, opts)
  }
}
