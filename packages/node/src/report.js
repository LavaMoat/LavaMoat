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
  hrLabel,
  hrPath,
  seconds,
  spinner,
  spinnerChars,
  success,
} from './format.js'
import { log as defaultLog } from './log.js'
import { noop, pluralize, toKeypath } from './util.js'
import { fileURLToPath } from 'node:url'

/**
 * @import {WriteStream} from 'node:tty'
 * @import {
 *   ModuleInspectionProgressReporter,
 *   ReportInvalidCanonicalNamesOptions,
 *   ReportModuleInspectionProgressEndFn,
 *   ReportModuleInspectionProgressFn,
 *   ReportSesViolationsOptions,
 *   StructuredViolation,
 *   StructuredViolationsResult,
 *   UnknownCanonicalNames
 * } from './internal.js'
 * @import {Loggerr} from './log.js'
 * @import {CanonicalName} from './types.js'
 */

/**
 * Reports resources from policy which weren't found on disk and are thus not in
 * the compartment map descriptor.
 *
 * If no `policy` is provided, this function does nothing.
 *
 * The keypath and suggestion for each issue are computed upstream by
 * `findUnknownCanonicalNames()` (from `@endo/compartment-mapper/policy.js`), so
 * this function is only responsible for formatting and logging them.
 *
 * @param {UnknownCanonicalNames} unknownCanonicalNames
 *
 *   - Issues describing canonical names referenced in policy but not found in the
 *       compartment map
 *
 * @param {ReportInvalidCanonicalNamesOptions} options
 * @returns {void}
 */
export const reportInvalidCanonicalNames = (
  unknownCanonicalNames,
  { policy, policyPath, log = defaultLog, what = 'policy' }
) => {
  if (!policy || unknownCanonicalNames.length === 0) {
    return
  }
  if (what !== 'policy' && what !== 'policy overrides') {
    throw new InvalidArgumentsError(
      `Expected 'what' to be either "policy" or "policy overrides"`
    )
  }

  let msg = `The following ${pluralize(unknownCanonicalNames.length, 'entry', 'entries')} found in ${what}`
  msg += policyPath ? ` (${hrPath(policyPath)})` : ''
  msg += ` ${pluralize(unknownCanonicalNames.length, 'was', 'were')} not associated with any Compartment and may be invalid:\n`
  msg += unknownCanonicalNames
    .map(({ canonicalName, path, suggestion }) => {
      const source =
        toKeypath(path) || `unknown location for "${canonicalName}"`
      return suggestion
        ? `  - ${hrCode(source)} (did you mean ${hrLabel(suggestion)}?)`
        : `  - ${hrCode(source)}`
    })
    .join('\n')
  log.warning(msg)
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
    log.warning(
      `Package ${hrLabel(canonicalName)} contains potential SES violations at the following ${pluralize(warnings.length, 'location')}:`
    )

    for (const warning of warnings) {
      log.warning(warning)
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

    log.warning(summaryMsg)
  }
}

/**
 * Creates a pair of functions for reporting module inspection progress.
 *
 * If the console is not a TTY, this function will return a pair of functions
 * that do nothing.
 *
 * @param {Object} options
 * @param {Loggerr} [options.log] - Logger to use for reporting
 * @param {WriteStream} [options.writeStream] - Stream to write progress to
 * @param {boolean} [options.disabled] - If true, the reporter will not report
 *   progress
 * @returns {ModuleInspectionProgressReporter}
 */
export const createModuleInspectionProgressReporter = ({
  log = defaultLog,
  writeStream = process.stderr,
  disabled = false,
} = {}) => {
  if (!writeStream.isTTY || disabled) {
    return {
      reportModuleInspectionProgress: noop,
      reportModuleInspectionProgressEnd: noop,
    }
  }

  /**
   * Counter for the spinner item
   */
  let spinnerCounter = 0

  /**
   * Start timestamp of the module inspection process
   *
   * @type {number}
   */
  let startTime

  /**
   * Reports progress of the module inspection process to the console.
   *
   * Displays a progress indicator on a single line, overwriting it as it
   * progresses.
   *
   * @type {ReportModuleInspectionProgressFn}
   */
  const reportModuleInspectionProgress = (
    inspectedModules,
    modulesToInspect
  ) => {
    startTime ??= Date.now()
    spinnerCounter++
    const prefixStr = spinner(
      spinnerChars[spinnerCounter % spinnerChars.length]
    )
    const duration = Date.now() - startTime
    const modulesPerSecond = inspectedModules.size / (duration / 1000)

    const inspectedRatioStr = colorSplit(
      `${inspectedModules.size}/${modulesToInspect.size}`,
      { delimiter: '/', color: hrCode, delimiterColor: hrCode.dim }
    )
    writeStream.write(
      `\r        ${chevron} ${prefixStr} ${action('Inspecting')} module ${inspectedRatioStr} (${seconds(modulesPerSecond)} modules/s)`
    )
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
    const duration = Date.now() - startTime
    const modulesPerSecond = inspectedModules.size / (duration / 1000)
    clearLine()
    log.info(
      `${success} ${action('Inspected')} ${hrCode(modulesToInspect.size)} (${seconds(modulesPerSecond)} modules/s)`
    )
  }

  return {
    reportModuleInspectionProgress,
    reportModuleInspectionProgressEnd,
  }
}
