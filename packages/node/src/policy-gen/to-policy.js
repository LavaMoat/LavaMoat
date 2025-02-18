/**
 * Provides {@link compartmentMapToPolicy} which generates a LavaMoat policy from
 * {@link CompartmentMapDescriptor CompartmentMapDescriptors} and
 * {@link Sources}.
 *
 * @packageDocumentation
 */

import chalk from 'chalk'
import { createModuleInspector } from 'lavamoat-core'
import { isBuiltin as defaultIsBuiltin } from 'node:module'
import { defaultReadPowers } from '../compartment/power.js'
import { DEFAULT_TRUST_ENTRYPOINT } from '../constants.js'
import { log as defaultLog } from '../log.js'
import { hrPath } from '../util.js'
import { LMRCache } from './lmr-cache.js'
import { PolicyGeneratorContext } from './policy-gen-context.js'

/**
 * @import {Sources,
 *   CompartmentMapDescriptor,
 *   ReadNowPowers} from '@endo/compartment-mapper'
 * @import {LavaMoatPolicy,
 *   LavaMoatPolicyDebug,
 *   LavaMoatPolicyOverrides,
 *   LavamoatModuleRecord,
 *   SesCompat,
 *   SesCompatObj,
 *   ModuleInspector} from 'lavamoat-core'
 * @import {BuildModuleRecordsOptions,
 *   CompartmentMapToPolicyOptions} from '../types.js'
 * @import {InspectModuleRecordsOptions, MissingModuleMap} from '../internal.js'
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
 * @param {InspectModuleRecordsOptions} [options] Options
 * @returns {ModuleInspector} The inspector
 */
const inspectModuleRecords = (
  moduleRecords,
  { debug = false, log = defaultLog, trustEntrypoint = true } = {}
) => {
  const inspector = createModuleInspector({
    isBuiltin: defaultIsBuiltin,
    includeDebugInfo: debug,
    trustRoot: trustEntrypoint,
  })

  /** @type {Map<string, string[]>} */
  const perModuleWarnings = new Map()

  inspector.on('compat-warning', (data) => {
    const { moduleRecord, compatWarnings } = /**
     * @type {{
     *   moduleRecord: LavamoatModuleRecord
     *   compatWarnings: SesCompat
     * }}
     */ (data)

    const { primordialMutations, strictModeViolations, dynamicRequires } =
      compatWarnings
    const nicePath = hrPath(moduleRecord.file)

    /** @type {string[]} */
    const warnings = perModuleWarnings.get(moduleRecord.packageName) || []

    /**
     * Adds SES compat issues to {@link warnings}
     *
     * @param {SesCompatObj[]} sesCompatObjs
     * @param {string} type
     */
    const addWarnings = (sesCompatObjs, type) => {
      if (sesCompatObjs.length) {
        warnings.push(
          ...sesCompatObjs.map(
            ({
              node: {
                loc: {
                  start: { line, column },
                },
              },
            }) => `- ${chalk.yellow(`${nicePath}:${line}:${column}`)} (${type})`
          )
        )
      }
    }

    addWarnings(primordialMutations, 'primordial mutation')
    addWarnings(strictModeViolations, 'strict-mode violation')
    addWarnings(dynamicRequires, 'dynamic require')

    /* c8 ignore next */
    if (!warnings.length) {
      // unlikely, but just in case
      log.warning('empty "compat-warning" event received from module inspector')
      return
    }

    perModuleWarnings.set(moduleRecord.packageName, warnings)
  })

  // FIXME: should we sort here?
  for (const record of moduleRecords) {
    inspector.inspectModule(record)
  }

  if (perModuleWarnings.size) {
    for (const [packageName, warnings] of perModuleWarnings) {
      log.warning(
        `Package ${chalk.magenta(packageName)} contains potential SES incompatibilities at the following locations:\n${warnings.join('\n')}`
      )
    }
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
  {
    readPowers = defaultReadPowers,
    isBuiltin,
    log = defaultLog,
    trustEntrypoint = true,
  } = {}
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
              // isEntry only makes sense if we trust the entrypoint, since its
              // name will be replaced with the root slug, which means resources
              // for the root slug would be written to the policy instead of the
              // canonical pkg name of the entrypoint
              isRoot: trustEntrypoint && entryCompartment === compartment,
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
      'The following packages reference unknown modules. These may be "peer" or "optional" dependencies (or something else). Execution will mostly like fail unless these are accounted for in policy overrides.'
    )
    const tabular = [...missingModules].flatMap(([compartment, missing]) =>
      [...missing].map((specifier) => ({
        Package: compartment,
        Requested: specifier,
      }))
    )
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
    log = defaultLog,
    trustEntrypoint = DEFAULT_TRUST_ENTRYPOINT,
  } = {}
) {
  const moduleRecords = buildModuleRecords(compartmentMap, sources, renames, {
    readPowers,
    isBuiltin,
    log,
    trustEntrypoint,
  })

  log.debug(`Trust entrypoint? ${trustEntrypoint}`)
  const inspector = inspectModuleRecords(moduleRecords, {
    debug,
    log,
    trustEntrypoint,
  })

  return inspector.generatePolicy({
    policyOverride,
  })
}
