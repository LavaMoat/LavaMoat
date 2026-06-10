/** @import {Opinion} from "./types.js" */

/**
 * @param {Opinion} opinion
 * @param {unknown} err
 */
export function warnSkipped(opinion, err) {
  const message = err instanceof Error ? err.message : String(err)
  console.warn(`⚠️  ${opinion.description}: ${message}`)
}

/**
 * @param {string} declared
 * @param {string} detected
 */
export function warnPmMismatch(declared, detected) {
  console.warn(
    `⚠️  Declared package manager (${declared}) differs from detected (${detected}).`
  )
}

/** @param {string} summary */
export function printSummary(summary) {
  console.log(summary)
}

/** @param {string} version */
export function printVersion(version) {
  console.log(version)
}

/** @param {string} help */
export function printHelp(help) {
  console.log(help)
}

/** @param {unknown} err */
export function printError(err) {
  console.error(err)
}
