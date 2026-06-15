import { collectFacts, detectPackageManager, isYarnV1 } from './tools/detect.js'
import { warnPmMismatch } from './tools/print.js'
import { reasonableDefaults as npmDefaults } from './npm/index.js'
import { reasonableDefaults as yarnDefaults } from './yarn/index.js'
import { reasonableDefaults as pnpmDefaults } from './pnpm/index.js'
/**
 * @import {
 *   Decisions,
 *   HardenResult
 * } from "./tools/types.js"
 */

/**
 * Main API: apply hardening defaults to the project at cwd.
 *
 * @param {object} options
 * @param {string} options.cwd
 * @param {string} [options.packageManager] - Override detected PM
 * @param {Decisions} options.decisions
 * @returns {Promise<HardenResult>}
 */
export async function hardenDefaults(options) {
  const { cwd, decisions } = options

  const facts = await collectFacts(cwd)
  const detected = detectPackageManager(facts)

  // Determine package manager
  let pmName = options.packageManager ?? null
  if (!pmName && decisions?.packageManager) {
    pmName = await decisions.packageManager()
  }
  if (!pmName && detected) {
    pmName = detected.name
  }
  if (!pmName) {
    throw new Error(
      'Could not detect package manager. Use --package-manager to specify one.'
    )
  }

  // Warn if detected differs from declared
  if (detected && pmName !== detected.name) {
    warnPmMismatch(pmName, detected.name)
  }

  // Refuse yarn v1
  if (pmName === 'yarn' && isYarnV1(facts)) {
    throw new Error('Yarn v1 is not supported. Please upgrade to Yarn 4.15+.')
  }

  let result
  switch (pmName) {
    case 'npm':
      result = await npmDefaults(facts, decisions)
      break
    case 'yarn':
      result = await yarnDefaults(facts, decisions)
      break
    case 'pnpm':
      result = await pnpmDefaults(facts, decisions)
      break
    default:
      throw new Error(`Unsupported package manager: ${pmName}`)
  }

  // sort results by file and key for consistent output
  result.sort((a, b) => {
    if (a.file < b.file) return -1
    if (a.file > b.file) return 1
    if (a.key < b.key) return -1
    if (a.key > b.key) return 1
    return 0
  })

  const summary =
    result.length === 0
      ? 'No changes needed — config already hardened.'
      : 'Applied hardening changes:\n' +
        result.map((r) => `  ✓ ${r.file}: ${r.key}`).join('\n')

  return { result, summary }
}
