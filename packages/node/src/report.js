/**
 * Provides functions which report various types of _warnings_ to the user.
 *
 * - {@link createModuleInspectionProgressReporter}: Creates a pair of functions
 *   for reporting module inspection progress.
 * - {@link reportInvalidCanonicalNames}: Reports resources from policy which
 *   weren't found on disk and are thus not in the compartment map descriptor.
 * - {@link reportSesViolations}: Logs SES violation warnings and suggested action
 *   items
 *
 * @packageDocumentation
 */

import { spinner as cliSpinner } from '@lavamoat/vog'
import { InvalidArgumentsError } from './error.js'
import {
  action,
  chevron,
  clearLine,
  colorSplit,
  deemphasis,
  emphasis,
  hazard,
  hrCode,
  hrCodeDim,
  hrLabel,
  hrPath,
  seconds,
  success,
} from './format.js'
import { log as defaultLog } from './log.js'
import { findCanonicalNameKeypath, noop, pluralize } from './util.js'
import { fileURLToPath } from 'node:url'

/**
 * @import {Logger} from '@lavamoat/vog/log.js'
 * @import {
 *   ModuleInspectionProgressReporter,
 *   ReportInvalidCanonicalNamesOptions,
 *   ReportModuleInspectionProgressEndFn,
 *   ReportModuleInspectionProgressFn,
 *   ReportSesViolationsOptions,
 *   StructuredViolation,
 *   StructuredViolationsResult
 * } from './internal.js'
 * @import {CanonicalName} from './types.js'
 */

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
 * @param {Set<CanonicalName>} unknownCanonicalNames - Set of canonical names
 *   that were referenced in policy but not found
 * @param {Set<CanonicalName>} knownCanonicalNames - Set of all canonical names
 *   found in the compartment map
 * @param {ReportInvalidCanonicalNamesOptions} options
 * @returns {void}
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

  // Create list of invalid canonical names with their keypaths and source
  // representations
  const unknownCanonicalNameMap = [...unknownCanonicalNames].map(
    (canonicalName) => {
      const keypath = findCanonicalNameKeypath(policy, canonicalName)
      return {
        name: canonicalName,
        source: keypath || `unknown location for "${canonicalName}"`,
      }
    }
  )

  // if we have any invalid overrides, we will search through the canonical
  // names from the compartment map and make suggestions for the user to fix
  // them
  if (unknownCanonicalNameMap.length) {
    /** @type {Map<string, string[]>} */
    const suggestions = new Map()
    for (const { name: unknownName } of unknownCanonicalNameMap) {
      const unknownNameParts = unknownName.split('>')
      const unknownPackageName = unknownNameParts[unknownNameParts.length - 1]
      const matches = [...knownCanonicalNames].filter((name) =>
        name.endsWith(`>${unknownPackageName}`)
      )
      if (matches.length) {
        const nameMatches = matches
          .slice(0, maxSuggestions)
          .map((name) => hrLabel(name))
        log.debug(
          `Found potential match(es) for ${hrLabel(unknownName)}: ${nameMatches.join(', ')}`
        )
        suggestions.set(unknownName, nameMatches)
      }
    }

    let msg = `The following ${pluralize(unknownCanonicalNameMap.length, 'entry', 'entries')} found in ${what}`
    msg += policyPath ? ` (${hrPath(policyPath)})` : ''
    msg += ` ${pluralize(unknownCanonicalNameMap.length, 'was', 'were')} not associated with any Compartment and may be invalid:\n`
    msg += unknownCanonicalNameMap
      .map(({ name, source }) => {
        if (suggestions.has(name)) {
          const suggestion = /** @type {string[]} */ (suggestions.get(name))
          return `  - ${hrCode(source)} (did you mean ${suggestion.join(' or ')}?)`
        }
        return `  - ${hrCode(source)}`
      })
      .join('\n')
    log.warn(msg)
    return
  }
}

/**
 * Logs SES violation warnings and suggested action items
 *
 * @param {Map<CanonicalName, StructuredViolationsResult>} violationsForPackage
 *   Map of canonical names to structured violations
 * @param {ReportSesViolationsOptions} [options]
 * @returns {void}
 */
export const reportSesViolations = (
  violationsForPackage,
  { log = defaultLog } = {}
) => {
  if (violationsForPackage.size === 0) {
    return
  }
  /**
   * Formats a structured violation into a warning message
   *
   * @param {StructuredViolation} violation
   * @returns {string}
   */
  const formatViolation = (violation) => {
    const { path, line, column, type } = violation
    const plainPath = fileURLToPath(path)
    const colRefPath = hrPath([plainPath, line, column].join(':'), true)
    return `  ${deemphasis('▶')} ${colRefPath} ${deemphasis('—')} ${emphasis(type)}`
  }

  /**
   * Prints warnings.
   *
   * @param {CanonicalName} canonicalName
   * @param {string[]} warnings
   * @returns {void}
   */
  const printWarnings = (canonicalName, warnings) => {
    log.warn(
      `Package ${hrLabel(canonicalName)} contains potential SES violations at the following ${pluralize(warnings.length, 'location')}:`
    )

    for (const warning of warnings) {
      log.warn(warning)
    }
  }

  let hasDynamicRequireViolations = false
  let hasStrictModeViolations = false
  let hasPrimordialMutationViolations = false

  for (const [canonicalName, violations] of violationsForPackage) {
    const { primordialMutations, strictModeViolations, dynamicRequires } =
      violations

    // Process primordial mutations
    if (primordialMutations.length > 0) {
      hasPrimordialMutationViolations = true
      printWarnings(canonicalName, primordialMutations.map(formatViolation))
    }

    // Process strict mode violations
    if (strictModeViolations.length > 0) {
      hasStrictModeViolations = true
      printWarnings(canonicalName, strictModeViolations.map(formatViolation))
    }

    // Process dynamic requires
    if (dynamicRequires.length > 0) {
      hasDynamicRequireViolations = true
      printWarnings(canonicalName, dynamicRequires.map(formatViolation))
    }
  }

  // we only want to display these "summary" messages if we found
  // violations of these specific type, and only once
  let summaryMsg = `${hazard} `
  if (hasDynamicRequireViolations) {
    summaryMsg += `${emphasis('Dynamic requires')} ${action('inhibit policy generation')}; if package boundaries are crossed, execution will ${action('fail')}. To mitigate, determine dynamically-required modules/packages, and edit policy overrides (if necessary), then re-run policy generation. `
  }
  // these two can be combined since remediation is the same
  if (hasStrictModeViolations || hasPrimordialMutationViolations) {
    if (hasStrictModeViolations) {
      summaryMsg += emphasis('Strict-mode violations')
      if (hasPrimordialMutationViolations) {
        summaryMsg += ` and ${emphasis('primordial mutations')}`
      }
    } else if (hasPrimordialMutationViolations) {
      summaryMsg += emphasis('Primordial mutations')
    }

    summaryMsg += ` will likely ${action('fail')} at runtime if attempted; patching is advised.`

    log.warn(summaryMsg)
  }
}

/**
 * Creates a pair of functions for reporting module inspection progress.
 *
 * If stderr is not a TTY, this function will return a pair of no-op functions.
 *
 * @param {Object} options
 * @param {Logger} [options.log] - Logger to use for reporting
 * @param {boolean} [options.disabled] - If true, the reporter will not report
 *   progress
 * @returns {ModuleInspectionProgressReporter}
 */
export const createModuleInspectionProgressReporter = ({
  log = defaultLog,
  disabled = false,
} = {}) => {
  if (!process.stderr.isTTY || disabled) {
    return {
      reportModuleInspectionProgress: noop,
      reportModuleInspectionProgressEnd: noop,
    }
  }

  /**
   * Start timestamp of the module inspection process
   *
   * @type {number | undefined}
   */
  let startTime

  /**
   * Whether the spinner has been started.
   */
  let spinning = false

  const spin = new cliSpinner.Spinner({
    text: `${chevron} %s ${action('Inspecting')} modules…`,
    stream: process.stderr,
  })
  spin.setSpinnerString('◰◳◲◱')
  spin.setSpinnerDelay(120)

  /**
   * Reports progress of the module inspection process to the console.
   *
   * Displays an animated spinner on a single line, overwriting it as it
   * progresses.
   *
   * @type {ReportModuleInspectionProgressFn}
   */
  const reportModuleInspectionProgress = (
    inspectedModules,
    modulesToInspect
  ) => {
    startTime ??= Date.now()
    const duration = Date.now() - startTime
    const modulesPerSecond = inspectedModules.size / (duration / 1000)

    const inspectedRatioStr = colorSplit(
      `${inspectedModules.size}/${modulesToInspect.size}`,
      { delimiter: '/', color: hrCode, delimiterColor: hrCodeDim }
    )

    spin.setSpinnerTitle(
      `${chevron} %s ${action('Inspecting')} module ${inspectedRatioStr} (${seconds(modulesPerSecond)} modules/s)`
    )

    if (!spinning) {
      spin.start()
      spinning = true
    }
  }

  /**
   * Reports the end of the module inspection process to the console.
   *
   * @type {ReportModuleInspectionProgressEndFn}
   */
  const reportModuleInspectionProgressEnd = (
    inspectedModules,
    modulesToInspect
  ) => {
    const duration = Date.now() - (startTime ?? Date.now())
    const modulesPerSecond = inspectedModules.size / (duration / 1000)
    if (spinning) {
      spin.stop(true)
      spinning = false
    }
    clearLine()
    log.info(
      `${success} ${action('Inspected')} ${hrCode(`${modulesToInspect.size}`)} (${seconds(modulesPerSecond)} modules/s)`
    )
  }

  return {
    reportModuleInspectionProgress,
    reportModuleInspectionProgressEnd,
  }
}
