/**
 * Provides functions which report various types of _warnings_ to the user.
 *
 * @packageDocumentation
 */

import chalk from 'chalk'

import { SES_VIOLATION_TYPES } from './constants.js'
import { InvalidArgumentsError } from './error.js'
import { hrCode, hrLabel, hrPath } from './format.js'
import { log as defaultLog } from './log.js'
import { getInvalidCanonicalNamesKit } from './policy-util.js'

/**
 * @import {ReportInvalidOverridesOptions, ReportSesViolationsOptions, SesViolationType} from './internal.js'
 * @import {CompartmentMapDescriptor} from '@endo/compartment-mapper'
 */

const { entries } = Object

/**
 * Default number of suggestions to make when reporting invalid canonical names
 * in policy
 */

const DEFAULT_MAX_INVALID_CANONICAL_NAME_SUGGESTIONS = 3

/**
 * Reports resources from policy which weren't found on disk and are thus not in
 * the compartment map descriptor.
 *
 * If no `policy` is provided, this function does nothing.
 *
 * @param {CompartmentMapDescriptor} compartmentMap
 * @param {ReportInvalidOverridesOptions} options
 * @returns {void}
 * @internal
 */
export const reportInvalidCanonicalNames = (
  compartmentMap,
  {
    log = defaultLog,
    maxSuggestions = DEFAULT_MAX_INVALID_CANONICAL_NAME_SUGGESTIONS,
    policy,
    policyPath,
    what = 'policy',
  }
) => {
  if (!policy) {
    return
  }
  if (what !== 'policy' && what !== 'policy overrides') {
    throw new InvalidArgumentsError(
      `Expected 'what' to be either "policy" or "policy overrides"`
    )
  }

  const { getInvalidCanonicalNames, policyCanonicalNameInfo } =
    getInvalidCanonicalNamesKit(policy, compartmentMap.compartments)

  const invalidCanonicalNames = getInvalidCanonicalNames()

  // if we have any invalid overrides, we will search through the canonical names from the compartment map and make suggestions for the user to fix them
  if (invalidCanonicalNames.length) {
    /** @type {Map<string, string[]>} */
    const suggestions = new Map()
    for (const { name: invalidName } of invalidCanonicalNames) {
      const invalidNameParts = invalidName.split('>')
      const invalidPackageName = invalidNameParts[invalidNameParts.length - 1]
      const matches = policyCanonicalNameInfo
        .filter(({ name }) => name.endsWith(invalidPackageName))
        .map(({ name }) => name)
      if (matches.length) {
        const nameMatches = matches
          .slice(0, maxSuggestions)
          .map((name) => hrLabel(name), true)
        log.debug(
          `Found potential match(es) for ${hrLabel(invalidName)}: ${nameMatches.join(', ')}`
        )
        suggestions.set(invalidName, nameMatches)
      }
    }

    let msg = `The following entries(s) found in ${what}`
    msg += policyPath ? ` (${hrPath(policyPath)})` : ''
    msg += ' were not associated with any Compartment and may be invalid:\n'
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
