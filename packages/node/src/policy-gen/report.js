/**
 * Provides functions which report various types of _warnings_ during policy
 * generation.
 *
 * @packageDocumentation
 */

import { Searcher, sortKind } from 'fast-fuzzy'
import { toKeypath } from 'to-keypath'
import { SES_VIOLATION_TYPES } from '../constants.js'
import { colors, hrCode, hrLabel, hrPath } from '../format.js'
import { log as defaultLog } from '../log.js'
/**
 * @import {ReportInvalidOverridesOptions, ReportSesViolationsOptions, SesViolationType} from '../internal.js'
 * @import {LavaMoatPolicy} from 'lavamoat-core'
 */

const { keys, entries } = Object

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
 * @param {Map<string, string>} canonicalNameMap
 * @param {ReportInvalidOverridesOptions} options
 * @returns {void}
 * @internal
 */
export const reportInvalidOverrides = (
  canonicalNameMap,
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

  const canonicalNames = new Set(canonicalNameMap.values())

  /**
   * Canonical names from the keys of {@link LavaMoatPolicy.resources}
   * (`ResourcePolicy`)
   */
  const resourceCanonicalNames = keys(policyOverride.resources).map((name) => ({
    name,
    source: toKeypath(['resources', name]),
  }))

  const untrustedRootResource = policyOverride.root?.usePolicy

  /**
   * Canonical names from the keys of `ResourcePolicy.packages`
   * (`PackagePolicy`)
   */
  const packagePolicyCanonicalNames = resourceCanonicalNames.flatMap(
    ({ name: resourceName }) =>
      keys(policyOverride.resources[resourceName].packages ?? {}).map(
        (name) => ({
          name,
          source: toKeypath(['resources', resourceName, 'packages', name]),
        })
      )
  )

  /**
   * Deduped `Set` of all canonical names found in policy overrides
   */
  const policyOverrideCanonicalNames = new Set([
    ...resourceCanonicalNames,
    ...packagePolicyCanonicalNames,
  ])

  // /**
  //  * Array of canonical names in policy overrides which were not found in the
  //  * compartment map
  //  *
  //  * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set/difference}
  //  * @todo Use `Set.prototype.difference` once widely available
  //  */
  // const invalidOverrides = [...policyOverrideCanonicalNames].filter(
  //   (key) => !canonicalNames.has(key)
  // )

  const invalidOverrides = [...policyOverrideCanonicalNames].filter(
    ({ name }) =>
      !canonicalNames.has(name) &&
      (!untrustedRootResource ||
        (untrustedRootResource && name !== untrustedRootResource))
  )

  // if we have any invalid overrides, we will search through the canonical names from the compartment map and make suggestions for the user to fix them
  if (invalidOverrides.length) {
    const searchObjects = [...canonicalNames].map((name) => {
      const sliced = name.split('>')
      return { fullName: name, name: `${sliced.pop()}` }
    })
    const searcher = new Searcher(searchObjects, {
      returnMatchData: true,
      sortBy: sortKind.bestMatch,
      keySelector: ({ name }) => name,
      // 1 would be exact match. I hope this corrects for typos
      threshold: 0.9,
    })
    /** @type {Map<string, string[]>} */
    const suggestions = new Map()
    for (const { name: invalidOverride } of invalidOverrides) {
      const slicedOverride = invalidOverride.split('>')
      const invalidOverridePackageName = `${slicedOverride.pop()}`
      const matches = searcher.search(invalidOverridePackageName)
      if (matches.length) {
        for (const { score, item } of matches) {
          log.debug(
            `Found match for ${hrLabel(invalidOverride)}: ${hrLabel(item.fullName)} with score ${score}`
          )
        }
        suggestions.set(
          invalidOverride,
          matches
            .map(({ item: { fullName } }) => fullName)
            .slice(0, maxSuggestions)
        )
      }
    }

    let msg = `The following entries(s) found in policy overrides`
    msg += policyOverridePath ? ` (${hrPath(policyOverridePath)})` : ''
    msg += ` were not associated with any Compartment and may be invalid:\n`
    msg += invalidOverrides
      .map(({ name, source }) => {
        if (suggestions.has(name)) {
          const suggestion = /** @type {string[]} */ (
            suggestions.get(name)
          ).map((suggestion) => hrLabel(suggestion, true))
          return `  - ${hrCode(source)} (did you mean ${suggestion.join(' or ')}?)`
        }
        return `  - ${hrCode(source)}`
      })
      .join('\n')
    log.warn(msg)
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
      log.warn(
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

  const bold = colors.yellowBright
  // we only want to display these next two "summary" messages if we found
  // violations of these specific type, and only once
  if (hasDynamicRequireViolations) {
    log.warn(
      `${bold('Dynamic requires')} inhibit policy generation; determine any required packages, edit policy overrides, then re-run policy generation.`
    )
  }
  // these two can be combined since remediation is the same
  if (hasStrictModeViolations || hasPrimordialMutationViolations) {
    let typeMsg = ''
    if (hasStrictModeViolations) {
      typeMsg = bold('Strict-mode violations')
    }
    if (hasPrimordialMutationViolations) {
      typeMsg += ` and ${bold('primordial mutations')}`
    }
    log.warn(
      `${typeMsg} will likely fail at runtime under LavaMoat; patching is advised.`
    )
  }
}
