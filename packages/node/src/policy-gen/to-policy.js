/**
 * Provides {@link compartmentMapToPolicy} which generates a LavaMoat policy from
 * {@link CompartmentMapDescriptor CompartmentMapDescriptors} and
 * {@link Sources}.
 *
 * @packageDocumentation
 */

import chalk from 'chalk'
import { createModuleInspector } from 'lavamoat-core'
import { isBuiltin as nodeIsBuiltin } from 'node:module'
import { defaultReadPowers } from '../compartment/power.js'
import { log as fallbackLog } from '../log.js'
import { LMRCache } from './lmr-cache.js'
import { PolicyGeneratorContext } from './policy-gen-context.js'

/**
 * @import {Sources,
 *   CompartmentMapDescriptor,
 *   ReadNowPowers} from '@endo/compartment-mapper'
 * @import {LavaMoatPolicy,
 *   LavaMoatPolicyDebug,
 *   SesCompat} from '@lavamoat/types'
 * @import {LavamoatModuleRecord,
 *   ModuleInspector} from 'lavamoat-core'
 * @import {BuildModuleRecordsOptions,
 *   CompartmentMapToPolicyOptions} from '../types.js'
 * @import {MissingModuleMap} from '../internal.js'
 * @import {Loggerr} from 'loggerr'
 * @import {SetFieldType} from 'type-fest'
 */

const { entries, freeze } = Object

/**
 * Uses `inspector` to inspect a compartment map and sources.
 *
 * If the `debug` option is `true`, the inspector will include debug
 * information.
 *
 * @param {LavamoatModuleRecord[]} moduleRecords Module records
 * @param {{ debug?: boolean; log?: Loggerr }} [options] Options
 * @returns {ModuleInspector} The inspector
 */
const inspectModuleRecords = (
  moduleRecords,
  { debug = false, log = fallbackLog } = {}
) => {
  const inspector = createModuleInspector({
    isBuiltin: nodeIsBuiltin,
    includeDebugInfo: debug,
  })

  inspector.on('compat-warning', (data) => {
    const { moduleRecord, compatWarnings } = /**
     * @type {{
     *   moduleRecord: LavamoatModuleRecord
     *   compatWarnings: SesCompat
     * }}
     */ (data)

    const { primordialMutations, strictModeViolations, dynamicRequires } =
      compatWarnings
    if (primordialMutations.length) {
      log.warning(
        `Package "${moduleRecord.packageName}" contains potential SES incompatibilities (primordial mutations) at the following location(s):\n${primordialMutations
          .map(({ node }) =>
            chalk.yellow(
              `- ${moduleRecord.file}:${node.loc.start.line}:${node.loc.start.column}`
            )
          )
          .join('\n')}`
      )
    }
    if (strictModeViolations.length) {
      log.warning(
        `Package "${moduleRecord.packageName}" contains potential SES incompatibilities (strict mode violations) at the following location(s):\n${strictModeViolations
          .map(({ node }) =>
            chalk.yellow(
              `- ${moduleRecord.file}:${node.loc.start.line}:${node.loc.start.column}`
            )
          )
          .join('\n')}`
      )
    }
    if (dynamicRequires.length) {
      log.warning(
        `Package "${moduleRecord.packageName}" contains potential SES incompatibilities (dynamic requires) at the following location(s):\n${dynamicRequires
          .map(({ node }) =>
            chalk.yellow(
              `- ${moduleRecord.file}:${node.loc.start.line}:${node.loc.start.column}`
            )
          )
          .join('\n')}`
      )
    }
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

  /** @type {MissingModuleMap} */
  const missingModules = new Map()
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

  if (missingModules.size) {
    log.warning(
      'The following packages reference unknown dependencies. These may be "peer" or "optional" dependencies (or something else). Execution will mostly like fail unless these are accounted for in policy overrides.'
    )
    const tabular = [...missingModules].map(([compartment, missing]) => ({
      Name: compartment,
      'Missing Package(s)': [...missing],
    }))
    // eslint-disable-next-line no-console
    console.table(tabular)
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

  const inspector = inspectModuleRecords(moduleRecords, { debug, log })

  return inspector.generatePolicy({
    policyOverride,
  })
}
