/**
 * Provides functions which report various types of _warnings_ to the user.
 *
 * @packageDocumentation
 */

import chalk from 'chalk'
import { toKeypath } from 'to-keypath'
import { SES_VIOLATION_TYPES } from './constants.js'
import { InvalidArgumentsError } from './error.js'
import { hrCode, hrLabel, hrPath } from './format.js'
import { log as defaultLog } from './log.js'

/**
 * @import {ReportInvalidOverridesOptions, ReportSesViolationsOptions, SesViolationType} from './internal.js'
 * @import {CompartmentMapDescriptor, CanonicalName} from '@endo/compartment-mapper'
 * @import {LavaMoatPolicy} from '@lavamoat/types'
 */

const { entries } = Object

/**
 * Default number of suggestions to make when reporting invalid canonical names
 * in policy
 */

const DEFAULT_MAX_INVALID_CANONICAL_NAME_SUGGESTIONS = 3

/**
 * Gets the keypath for a canonical name within a LavaMoat policy object
 *
 * @param {LavaMoatPolicy} policy
 * @param {CanonicalName} canonicalName
 * @returns {string | undefined} The keypath as a string, or undefined if not
 *   found
 */
const findCanonicalNameKeypath = (policy, canonicalName) => {
  const { resources } = policy

  // Check if it's a direct resource
  if (canonicalName in resources) {
    return toKeypath(['resources', canonicalName])
  }

  // Check nested packages
  for (const [resourceName, resourcePolicy] of Object.entries(resources)) {
    if (resourcePolicy.packages && canonicalName in resourcePolicy.packages) {
      return toKeypath(['resources', resourceName, 'packages', canonicalName])
    }
  }

  // Check include array
  if (policy.include?.includes(canonicalName)) {
    return toKeypath(['include', canonicalName])
  }

  return undefined
}

/**
 * Reports resources from policy which weren't found on disk and are thus not in
 * the compartment map descriptor.
 *
 * If no `policy` is provided, this function does nothing.
 *
 * @param {Set<CanonicalName>} unknownCanonicalNames - Set of canonical names
 *   that were referenced in policy but not found
 * @param {Set<CanonicalName>} knownCanonicalNames - Set of all canonical names
 *   found in the compartment map
 * @param {ReportInvalidOverridesOptions} options
 * @returns {void}
 * @internal
 */
export const reportInvalidCanonicalNames = (
  unknownCanonicalNames,
  knownCanonicalNames,
  {
    policy,
    policyPath,
    log = defaultLog,
    maxSuggestions = DEFAULT_MAX_INVALID_CANONICAL_NAME_SUGGESTIONS,
    what = 'policy',
  }
) => {
  if (!policy || unknownCanonicalNames.size === 0) {
    return
  }
  if (what !== 'policy' && what !== 'policy overrides') {
    throw new InvalidArgumentsError(
      `Expected 'what' to be either "policy" or "policy overrides"`
    )
  }

  // Create list of invalid canonical names with their keypaths and source representations
  const invalidCanonicalNames = [...unknownCanonicalNames]
    .map((canonicalName) => {
      const keypath = findCanonicalNameKeypath(policy, canonicalName)
      return {
        name: canonicalName,
        source: keypath || `unknown location for "${canonicalName}"`,
      }
    })
    .filter(({ source }) => source !== undefined)

  // if we have any invalid overrides, we will search through the canonical names from the compartment map and make suggestions for the user to fix them
  if (invalidCanonicalNames.length) {
    /** @type {Map<string, string[]>} */
    const suggestions = new Map()
    for (const { name: invalidName } of invalidCanonicalNames) {
      const invalidNameParts = invalidName.split('>')
      const invalidPackageName = invalidNameParts[invalidNameParts.length - 1]
      const matches = [...knownCanonicalNames].filter((name) =>
        name.endsWith(`>${invalidPackageName}`)
      )
      if (matches.length) {
        const nameMatches = matches
          .slice(0, maxSuggestions)
          .map((name) => hrLabel(name))
        log.debug(
          `Found potential match(es) for ${hrLabel(invalidName)}: ${nameMatches.join(', ')}`
        )
        suggestions.set(invalidName, nameMatches)
      }
    }

    let msg = `The following entries(s) found in ${what}`
    msg += policyPath ? ` (${hrPath(policyPath)})` : ''
    msg += ` were not associated with any Compartment and may be invalid:\n`
    msg += invalidCanonicalNames
      .map(({ name, source }) => {
        if (suggestions.has(name)) {
          const suggestion = /** @type {string[]} */ (suggestions.get(name))
          return `  - ${hrCode(source)} (did you mean ${suggestion.join(' or ')}?)`
        }
        return `  - ${hrCode(source)}`
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
