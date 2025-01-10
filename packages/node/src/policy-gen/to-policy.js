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
import { stripVTControlCharacters } from 'node:util'
import { defaultReadPowers } from '../compartment/power.js'
import { DEFAULT_TRUST_ROOT_COMPARTMENT } from '../constants.js'
import { GenerationError } from '../error.js'
import { log as defaultLog } from '../log.js'
import { hrLabel, hrPath, toPath } from '../util.js'
import { LMRCache } from './lmr-cache.js'
import { PolicyGeneratorContext } from './policy-gen-context.js'

/**
 * @import {Sources,
 *   CompartmentMapDescriptor,
 *   ReadNowPowers} from '@endo/compartment-mapper'
 * @import {LavaMoatPolicy,
 *   LavaMoatPolicyDebug,
 *   LavamoatModuleRecord,
 *   SesCompat,
 *   SesCompatObj} from '@lavamoat/types'
 * @import {ModuleInspector} from 'lavamoat-core'
 * @import {BuildModuleRecordsOptions,
 * CompartmentMapToDebugPolicyOptions,} from '../types.js'
 * @import {InspectModuleRecordsOptions, CompartmentMapToPolicyOptions} from '../internal.js'
 * @import {Loggerr} from 'loggerr'
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
  { debug = false, log = defaultLog, trustRoot = true } = {}
) => {
  const inspector = createModuleInspector({
    isBuiltin: defaultIsBuiltin,
    includeDebugInfo: debug,
    trustRoot,
  })

  /** @type {Map<string, string[]>} */
  const perPackageWarnings = new Map()

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
    const warnings = perPackageWarnings.get(moduleRecord.packageName) || []

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
            }) => {
              const plainPath = stripVTControlCharacters(nicePath)
              return `- ${chalk.yellowBright([plainPath, line, column].join(chalk.yellow(':')))} ${chalk.cyan(`(${type})`)}`
            }
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
      log.warning(
        'empty "compat-warning" event received from module inspector; this is a bug'
      )
      return
    }

    perPackageWarnings.set(moduleRecord.packageName, warnings)
  })

  for (const record of moduleRecords) {
    inspector.inspectModule(record)
  }

  if (perPackageWarnings.size) {
    for (const [packageName, warnings] of perPackageWarnings) {
      log.warning(
        `Package ${hrLabel(packageName)} contains potential SES incompatibilities at the following locations:\n${warnings.join('\n')}`
      )
    }
  }

  return inspector
}

/**
 * Creates {@link LavamoatModuleRecord LavamoatModuleRecords} from a compartment
 * map descriptor and sources.
 *
 * @param {string | URL} entrypoint
 * @param {CompartmentMapDescriptor} compartmentMap Compartment map descriptor
 * @param {Sources} sources Sources
 * @param {Record<string, string>} renames Mapping of compartment name to
 *   filepath
 * @param {BuildModuleRecordsOptions} options Options
 * @returns {LavamoatModuleRecord[]} Module records
 * @internal
 */
export const buildModuleRecords = (
  entrypoint,
  compartmentMap,
  sources,
  renames,
  {
    readPowers = defaultReadPowers,
    isBuiltin = defaultIsBuiltin,
    log = defaultLog,
  } = {}
) => {
  const lmrCache = LMRCache.create()

  const entryCompartment =
    compartmentMap.compartments[compartmentMap.entry.compartment]

  if (!entryCompartment) {
    throw new GenerationError('Could not find entry compartment; this is a bug')
  }

  const compartmentRenames = freeze({ ...renames })

  const entrypointPath = toPath(entrypoint)

  const contexts = entries(compartmentMap.compartments).reduce(
    (acc, [compartmentName, compartment]) => {
      if (compartmentName in sources) {
        acc.push([
          compartmentName,
          PolicyGeneratorContext.create(
            compartment,
            compartmentRenames,
            lmrCache,
            {
              rootModule:
                compartment === entryCompartment ? entrypointPath : undefined,
              readPowers,
              isBuiltin,
              log,
            }
          ),
        ])
      }
      return acc
    },
    /**
     * @type {[
     *   compartmentName: string,
     *   context: PolicyGeneratorContext<any>,
     * ][]}
     */ ([])
  )

  const moduleRecords = contexts.reduce((acc, [compartmentName, context]) => {
    /* c8 ignore next */
    if (!(compartmentName in sources)) {
      // "should never happen"™
      throw new GenerationError(
        `Could not find corresponding source for ${compartmentName}; this is a bug`
      )
    }

    const compartmentSources = sources[compartmentName]
    log.debug(
      `${hrLabel(compartmentMap.compartments[compartmentName].label)}: building module records…`
    )
    const records = context.buildModuleRecords(compartmentSources)

    for (const record of records) {
      acc.add(record)
    }

    return acc
  }, /** @type {Set<LavamoatModuleRecord>} */ (new Set()))

  return [...moduleRecords]
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
 * @param {string | URL} entrypoint Path to the entry module
 * @param {Readonly<CompartmentMapDescriptor>} compartmentMap The whole
 *   compartment map
 * @param {Readonly<Sources>} sources The sources for each compartment
 * @param {Readonly<Record<string, string>>} renames Mapping of compartment name
 *   back to filepath
 * @param {CompartmentMapToDebugPolicyOptions} options Options where `debug` is
 *   `true` (required)
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
 * @param {string | URL} entrypoint Path to the entry module
 * @param {Readonly<CompartmentMapDescriptor>} compartmentMap The whole
 *   compartment map
 * @param {Readonly<Sources>} sources The sources for each compartment
 * @param {Readonly<Record<string, string>>} renames Mapping of compartment name
 *   back to filepath
 * @param {CompartmentMapToPolicyOptions} [options] Options
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
 * @param {string | URL} entrypoint Path to the entry module
 * @param {Readonly<CompartmentMapDescriptor>} compartmentMap The whole
 *   compartment map
 * @param {Readonly<Sources>} sources The sources for each compartment
 * @param {Readonly<Record<string, string>>} renames Mapping of compartment name
 *   back to filepath
 * @param {CompartmentMapToPolicyOptions} [options] Options
 * @returns {LavaMoatPolicy | LavaMoatPolicyDebug} Generated policy
 * @public
 */
export function compartmentMapToPolicy(
  entrypoint,
  compartmentMap,
  sources,
  renames,
  {
    readPowers,
    policyOverride,
    debug = false,
    isBuiltin,
    log = defaultLog,
    trustRoot = DEFAULT_TRUST_ROOT_COMPARTMENT,
  } = {}
) {
  const moduleRecords = buildModuleRecords(
    entrypoint,
    compartmentMap,
    sources,
    renames,
    {
      readPowers,
      isBuiltin,
      log,
    }
  )
  log.debug('Inspecting module records…')
  const inspector = inspectModuleRecords(moduleRecords, {
    debug,
    log,
    trustRoot,
  })

  return inspector.generatePolicy({
    policyOverride,
  })
}
