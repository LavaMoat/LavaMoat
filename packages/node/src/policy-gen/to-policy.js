/**
 * Provides {@link compartmentMapToPolicy} which generates a LavaMoat policy from
 * {@link CompartmentMapDescriptor CompartmentMapDescriptors} and
 * {@link Sources}.
 *
 * @packageDocumentation
 */

import { createModuleInspector } from 'lavamoat-core'
import { isBuiltin as defaultIsBuiltin } from 'node:module'
import { defaultReadPowers } from '../compartment/power.js'
import { DEFAULT_TRUST_ROOT_COMPARTMENT } from '../constants.js'
import { GenerationError } from '../error.js'
import { hrLabel } from '../format.js'
import { log as defaultLog } from '../log.js'
import { toPath } from '../util.js'
import { LMRCache } from './lmr-cache.js'
import { makeModuleResolver } from './module-resolver.js'
import { PolicyGeneratorContext } from './policy-gen-context.js'
import { reportSesViolations } from './report.js'
import { makeSesCompatListener } from './ses-compat.js'

/**
 * @import {Sources,
 *   CompartmentMapDescriptor,
 *   ReadNowPowers} from '@endo/compartment-mapper'
 * @import {LavaMoatPolicy,
 *   LavaMoatPolicyDebug,
 *   LavamoatModuleRecord} from 'lavamoat-core'
 * @import {CompleteCompartmentDescriptorDataMap} from '../types.js'
 * @import {ModuleRecordsToDebugPolicyOptions,
 *   ModuleRecordsToPolicyOptions,
 *   BuildModuleRecordsOptions,
 *   CompartmentMapToDebugPolicyOptions,
 *   CompartmentMapToPolicyOptions,
 *   SesViolationType} from '../internal.js'
 * @import {Loggerr} from 'loggerr'
 */

const { entries, freeze, keys } = Object

/**
 * Generate a LavaMoat debug policy from `LavamoatModuleRecord` objects.
 *
 * @overload
 * @param {LavamoatModuleRecord[]} moduleRecords Module records
 * @param {ModuleRecordsToDebugPolicyOptions} [options] Options
 * @returns {LavaMoatPolicyDebug} Debug policy
 */

/**
 * Generate a LavaMoat policy from `LavamoatModuleRecord` objects.
 *
 * @overload
 * @param {LavamoatModuleRecord[]} moduleRecords Module records
 * @param {ModuleRecordsToPolicyOptions} [options] Options
 * @returns {LavaMoatPolicy} LavaMoat policy
 */

/**
 * Generate a LavaMoat policy or debug policy from `LavamoatModuleRecord`
 * objects
 *
 * @param {LavamoatModuleRecord[]} moduleRecords Module records
 * @param {ModuleRecordsToPolicyOptions | ModuleRecordsToDebugPolicyOptions} [options]
 *   Options
 */
const moduleRecordsToPolicy = (
  moduleRecords,
  {
    debug: includeDebugInfo = false,
    isBuiltin = defaultIsBuiltin,
    log = defaultLog,
    trustRoot = DEFAULT_TRUST_ROOT_COMPARTMENT,
    policyOverride,
  } = {}
) => {
  const inspector = createModuleInspector({
    isBuiltin,
    includeDebugInfo,
    trustRoot,
  })

  /** @type {Map<string, Partial<Record<SesViolationType, string[]>>>} */
  const perPackageWarnings = new Map()
  /** @type {Set<SesViolationType>} */
  const foundViolationTypes = new Set()

  const compatWarningListener = makeSesCompatListener(
    perPackageWarnings,
    foundViolationTypes,
    { log }
  )

  inspector.on('compat-warning', compatWarningListener)

  for (const moduleRecord of moduleRecords) {
    inspector.inspectModule(moduleRecord)
  }

  inspector.off('compat-warning', compatWarningListener)

  if (perPackageWarnings.size) {
    reportSesViolations(perPackageWarnings, { log })
  }

  return inspector.generatePolicy({ policyOverride })
}

/**
 * Creates {@link LavamoatModuleRecord LavamoatModuleRecords} from a compartment
 * map descriptor and sources.
 *
 * @template {CompartmentMapDescriptor} T
 * @param {string | URL} entrypoint
 * @param {T} compartmentMap Compartment map descriptor
 * @param {CompleteCompartmentDescriptorDataMap<T>} dataMap Map of compartment
 *   descriptors to
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
  dataMap,
  sources,
  renames,
  {
    readPowers = defaultReadPowers,
    isBuiltin = defaultIsBuiltin,
    log = defaultLog,
  } = {}
) => {
  const lmrCache = LMRCache.create()

  const { compartments, entry } = compartmentMap
  const entryCompartment = compartments[entry.compartment]

  /* c8 ignore next */
  if (!entryCompartment) {
    throw new GenerationError(
      'Could not find entry compartment descriptor; this is a bug'
    )
  }

  const compartmentRenames = freeze({ ...renames })

  const entrypointPath = toPath(entrypoint)

  const moduleResolver = makeModuleResolver(
    compartmentMap,
    compartmentRenames,
    { readPowers, log }
  )
  log.debug(
    `Building building records for ${keys(compartments.length)} compartments…`
  )
  const contexts = entries(compartments).reduce(
    (acc, [compartmentName, compartmentDescriptor]) => {
      if (compartmentName in sources) {
        const data = dataMap.get(compartmentName)
        if (!data) {
          throw new ReferenceError(
            `Could not find data for compartment descriptor ${hrLabel(compartmentName)}; this is a bug`
          )
        }
        const rootModule =
          compartmentDescriptor === entryCompartment
            ? entrypointPath
            : undefined

        const context = PolicyGeneratorContext.create(
          compartmentDescriptor,
          data,
          moduleResolver,
          lmrCache,
          {
            rootModule,
            readPowers,
            isBuiltin,
            log,
          }
        )

        acc.push([compartmentName, context])
      } else {
        log.debug(
          `${hrLabel(compartmentMap.compartments[compartmentName].label)}: skipping compartment; no sources`
        )
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
 * @template {CompartmentMapDescriptor} T
 * @overload
 * @param {string | URL} entrypoint Path to the entry module
 * @param {Readonly<T>} compartmentMap The whole compartment map
 * @param {Readonly<CompleteCompartmentDescriptorDataMap<T>>} dataMap The data
 *   map
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
 * @template {CompartmentMapDescriptor} T
 * @overload
 * @param {string | URL} entrypoint Path to the entry module
 * @param {Readonly<T>} compartmentMap The whole compartment map
 * @param {Readonly<CompleteCompartmentDescriptorDataMap<T>>} dataMap The data
 *   map
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
 * @template {CompartmentMapDescriptor} T
 * @param {string | URL} entrypoint Path to the entry module
 * @param {Readonly<T>} compartmentMap The whole compartment map
 * @param {Readonly<CompleteCompartmentDescriptorDataMap<T>>} dataMap The data
 *   map
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
  dataMap,
  sources,
  renames,
  {
    readPowers,
    policyOverride,
    debug = false,
    isBuiltin = defaultIsBuiltin,
    log = defaultLog,
    trustRoot = DEFAULT_TRUST_ROOT_COMPARTMENT,
  } = {}
) {
  const moduleRecords = buildModuleRecords(
    entrypoint,
    compartmentMap,
    dataMap,
    sources,
    renames,
    {
      readPowers,
      isBuiltin,
      log,
    }
  )
  log.debug(`Built ${moduleRecords.length} module records`)
  return moduleRecordsToPolicy(moduleRecords, {
    debug,
    isBuiltin,
    log,
    trustRoot,
    policyOverride,
  })
}
