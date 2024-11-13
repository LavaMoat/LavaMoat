/**
 * Provides {@link compartmentMapToPolicy} which generates a LavaMoat policy from
 * {@link CompartmentMapDescriptor CompartmentMapDescriptors} and
 * {@link Sources}.
 *
 * @packageDocumentation
 */

import { createModuleInspector } from 'lavamoat-core'
import { isBuiltin as nodeIsBuiltin } from 'node:module'
import { log as fallbackLog } from '../log.js'
import { defaultReadPowers } from '../power.js'
import { LMRCache } from './lmr-cache.js'
import { PolicyGeneratorContext } from './policy-generator-context.js'

/**
 * @import {Sources,
 *   CompartmentMapDescriptor,
 *   ReadNowPowers} from '@endo/compartment-mapper'
 * @import {LavaMoatPolicy,
 *   LavaMoatPolicyDebug,
 *   LavaMoatPolicyOverrides,
 *   LavamoatModuleRecord,
 *   ModuleInspector} from 'lavamoat-core'
 * @import {BuildModuleRecordsOptions,
 *   CompartmentMapToPolicyOptions,
 *   MissingModule} from '../types.js'
 * @import {SetFieldType} from 'type-fest'
 */

const { entries, freeze } = Object

/**
 * Uses `inspector` to inspect a compartment map and sources.
 *
 * @param {LavamoatModuleRecord[]} moduleRecords Module records
 * @param {boolean} [debug=false] - If `true`, the inspector will include debug
 *   information. Default is `false`
 * @returns {ModuleInspector} The inspector
 */
const inspectModuleRecords = (moduleRecords, debug = false) => {
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
 * Creates {@link LavamoatModuleRecord LavamoatModuleRecords} from a compartment
 * map descriptor and sources.
 *
 * @param {CompartmentMapDescriptor} compartmentMap Compartment map descriptor
 * @param {Sources} sources Sources
 * @param {Record<string, string>} renames Mapping of compartment name to
 *   filepath
 * @param {BuildModuleRecordsOptions} options Options
 * @returns {LavamoatModuleRecord[]} Module records
 * @internal
 */
export const buildModuleRecords = (
  compartmentMap,
  sources,
  renames,
  { readPowers = defaultReadPowers, isBuiltin, log = fallbackLog } = {}
) => {
  const lmrCache = new LMRCache()

  const entryCompartment =
    compartmentMap.compartments[compartmentMap.entry.compartment]

  if (!entryCompartment) {
    throw new TypeError('Could not find entry compartment; this is a bug')
  }

  const compartmentRenames = freeze(renames)

  /** @type {MissingModule[]} */
  const missingModules = []
  const contexts = entries(compartmentMap.compartments)
    // TODO: warn about this? how frequently does this occur?
    // likewise: can something be in sources but not in the compartment map?
    .filter(([compartmentName]) => compartmentName in sources)
    .map(
      ([compartmentName, compartment]) =>
        /** @type {[string, PolicyGeneratorContext]} */ ([
          compartmentName,
          PolicyGeneratorContext.create(
            compartment,
            compartmentRenames,
            lmrCache,
            {
              isEntry: entryCompartment === compartment,
              readPowers,
              isBuiltin,
              missingModules,
              log,
            }
          ),
        ])
    )

  let moduleRecords = contexts
    .flatMap(([compartmentName, context]) => {
      if (!(compartmentName in sources)) {
        // "should never happen"™
        throw new ReferenceError(
          `Could not find corresponding source for ${compartmentName}; this is a bug`
        )
      }

      const compartmentSources = sources[compartmentName]

      return context.buildModuleRecords(compartmentSources)
    })
    .filter(Boolean)

  moduleRecords = [...new Set(moduleRecords)]

  if (missingModules.length) {
    log.warning(
      'The following packages reference unknown dependencies. These may be "peer" or "optional" dependencies (or something else). Execution will mostly like fail unless these are accounted for in policy overrides.'
    )
    // eslint-disable-next-line no-console
    console.table(missingModules)
  }

  return moduleRecords
}

/**
 * Generates a LavaMoat "debug" policy.
 *
 * Policy generation occurs in three (3) steps:
 *
 * 1. Build module records from the `CompartmentMapDescriptor` and associated
 *    `Sources`
 * 2. Inspect the module records using LavaMoat's `ModuleInspector`
 * 3. Generate the policy using the `ModuleInspector`
 *
 * @overload
 * @param {Readonly<CompartmentMapDescriptor>} compartmentMap
 * @param {Readonly<Sources>} sources
 * @param {Readonly<Record<string, string>>} renames
 * @param {SetFieldType<CompartmentMapToPolicyOptions, 'debug', true>} options
 * @returns {LavaMoatPolicyDebug} Generated debug policy
 * @public
 */

/**
 * Generates a LavaMoat policy.
 *
 * Policy generation occurs in three (3) steps:
 *
 * 1. Build module records from the `CompartmentMapDescriptor` and associated
 *    `Sources`
 * 2. Inspect the module records using LavaMoat's `ModuleInspector`
 * 3. Generate the policy using the `ModuleInspector`
 *
 * @overload
 * @param {Readonly<CompartmentMapDescriptor>} compartmentMap
 * @param {Readonly<Sources>} sources
 * @param {Readonly<Record<string, string>>} renames
 * @param {CompartmentMapToPolicyOptions} [options]
 * @returns {LavaMoatPolicy} Generated policy
 * @public
 */

/**
 * Generates a LavaMoat policy or "debug" policy.
 *
 * Policy generation occurs in three (3) steps:
 *
 * 1. Build module records from the `CompartmentMapDescriptor` and associated
 *    `Sources`
 * 2. Inspect the module records using LavaMoat's `ModuleInspector`
 * 3. Generate the policy using the `ModuleInspector`
 *
 * @param {Readonly<CompartmentMapDescriptor>} compartmentMap
 * @param {Readonly<Sources>} sources
 * @param {Readonly<Record<string, string>>} renames
 * @param {CompartmentMapToPolicyOptions} [options]
 * @returns {LavaMoatPolicy | LavaMoatPolicyDebug} Generated policy
 * @public
 */
export function compartmentMapToPolicy(
  compartmentMap,
  sources,
  renames,
  {
    readPowers,
    policyOverride,
    debug = false,
    isBuiltin,
    log = fallbackLog,
  } = {}
) {
  const moduleRecords = buildModuleRecords(compartmentMap, sources, renames, {
    readPowers,
    isBuiltin,
    log,
  })

  const inspector = inspectModuleRecords(moduleRecords, debug)

  return inspector.generatePolicy({
    policyOverride,
  })
}
