/**
 * Provides functions which report various types of _warnings_ during policy
 * generation.
 *
 * @packageDocumentation
 */

import chalk from 'chalk'
import { Searcher } from 'fast-fuzzy'
import { SES_VIOLATION_TYPES } from '../constants.js'
import { GenerationError } from '../error.js'
import { hrLabel, hrPath } from '../format.js'
import { log as defaultLog } from '../log.js'
/**
 * @import {ReportInvalidOverridesOptions, ReportSesViolationsOptions, SesViolationType} from '../internal.js'
 * @import {CompleteCompartmentDescriptorDataMap} from '../types.js'
 * @import {LavaMoatPolicy} from 'lavamoat-core'
 * @import {CompartmentMapDescriptor} from '@endo/compartment-mapper'
 */

const { keys, values, entries } = Object

/**
 * Default number of suggestions to make when reporting invalid overrides
 */

const DEFAULT_MAX_OVERRIDE_SUGGESTIONS = 3

/**
 * Reports policy override resources which weren't found on disk and are thus
 * not in the compartment map descriptor.
 *
 * If no `policyOverride` is provided, this function does nothing.
 *
 * @param {CompartmentMapDescriptor} compartmentMap
 * @param {CompleteCompartmentDescriptorDataMap} dataMap
 * @param {ReportInvalidOverridesOptions} options
 * @returns {void}
 * @internal
 */
export const reportInvalidOverrides = (
  compartmentMap,
  dataMap,
  {
    policyOverride,
    policyOverridePath,
    log = defaultLog,
    maxSuggestions = DEFAULT_MAX_OVERRIDE_SUGGESTIONS,
  }
) => {
  if (!policyOverride) {
    return
  }

  /**
   * All canonical names from the `CompartmentMapDescriptor`.
   */
  const canonicalNames = new Set(
    values(compartmentMap.compartments).map((compartmentDescriptor) => {
      const data = dataMap.get(compartmentDescriptor.location)
      /* c8 ignore next */
      if (!data) {
        throw new GenerationError(
          `Missing data for compartment with label ${hrLabel(compartmentDescriptor.label)}; this is a bug`
        )
      }

      return data.canonicalName
    })
  )

  /**
   * Canonical names from the keys of {@link LavaMoatPolicy.resources}
   * (`ResourcePolicy`)
   */
  const resourceCanonicalNames = keys(policyOverride.resources)

  /**
   * Canonical names from the keys of `ResourcePolicy.packages`
   * (`PackagePolicy`)
   */
  const packagePolicyCanonicalNames = resourceCanonicalNames.flatMap((name) =>
    keys(policyOverride.resources[name].packages ?? {})
  )

  /**
   * Deduped `Set` of all canonical names found in policy overrides
   */
  const policyCanonicalNames = new Set([
    ...resourceCanonicalNames,
    ...packagePolicyCanonicalNames,
  ])

  /**
   * Array of canonical names in policy overrides which were not found in the
   * compartment map
   *
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set/difference}
   * @todo Use `Set.prototype.difference` once widely available
   */
  const invalidOverrides = [...policyCanonicalNames].filter(
    (key) => !canonicalNames.has(key)
  )

  // if we have any invalid overrides, we will search through the canonical names from the compartment map and make suggestions for the user to fix them
  if (invalidOverrides.length) {
    const searcher = new Searcher([...canonicalNames])
    /** @type {Map<string, string[]>} */
    const suggestions = new Map()
    for (const invalidOverride of invalidOverrides) {
      const matches = searcher.search(invalidOverride)
      if (matches.length) {
        suggestions.set(invalidOverride, matches.slice(0, maxSuggestions))
      }
    }

    let msg = `The following resource(s) provided in policy overrides`
    msg += policyOverridePath ? ` (${hrPath(policyOverridePath)})` : ''
    msg += ` were not found and may be invalid:\n`
    msg += invalidOverrides
      .map((invalidOverride) => {
        if (suggestions.has(invalidOverride)) {
          const suggestion = /** @type {string[]} */ (
            suggestions.get(invalidOverride)
          )
          return `  - ${hrLabel(invalidOverride)} (did you mean ${suggestion.join(' or ')}?)`
        }
        return `  - ${hrLabel(invalidOverride)}`
      })
      .join('\n')
    log.warning(msg)
  }
}

/**
 * Logs SES violation warnings and suggested action items
 *
 * @param {Map<string, Partial<Record<SesViolationType, string[]>>>} perPackageWarnings
 *   Map of package names to warning messages by SES violation type
 * @param {ReportSesViolationsOptions} [options]
 * @returns {void}
 * @internal
 */
export const reportSesViolations = (
  perPackageWarnings,
  { log = defaultLog } = {}
) => {
  let hasDynamicRequireViolations = false
  let hasStrictModeViolations = false
  let hasPrimordialMutationViolations = false
  for (const [packageName, warningsByType] of perPackageWarnings) {
    for (const [type, warnings] of entries(warningsByType)) {
      log.warning(
        `Package ${hrLabel(packageName)} contains potential SES incompatibilities at the following locations:\n${warnings.join('\n')}`
      )
      switch (type) {
        case SES_VIOLATION_TYPES.DynamicRequires:
          hasDynamicRequireViolations = true
          break
        case SES_VIOLATION_TYPES.StrictModeViolation:
          hasStrictModeViolations = true
          break
        case SES_VIOLATION_TYPES.PrimordialMutation:
          hasPrimordialMutationViolations = true
      }
    }
  }

  const bold = chalk.yellowBright.bold
  // we only want to display these next two "summary" messages if we found
  // violations of these specific type, and only once
  if (hasDynamicRequireViolations) {
    log.warning(
      `${bold('Dynamic requires')} inhibit policy generation; determine any required packages, edit policy overrides, then re-run policy generation.`
    )
  }
  // these two can be combined since remediation is the same
  if (hasStrictModeViolations || hasPrimordialMutationViolations) {
    let typeMsg = ''
    if (hasStrictModeViolations) {
      typeMsg = chalk.yellowBright.bold('Strict-mode violations')
    }
    if (hasPrimordialMutationViolations) {
      typeMsg += ` and ${chalk.yellowBright.bold('primordial mutations')}`
    }
    log.warning(
      `${typeMsg} will likely fail at runtime under LavaMoat; patching is advised.`
    )
  }
}
