import { collectFacts, detectPackageManager, isYarnV1 } from './tools/detect.js'
import { print as defaultPrint } from './tools/print.js'
import { applyOpinions } from './tools/apply-opinions.js'

import { opinions as npmOpinions } from './npm/opinions.js'
import { opinions as yarnOpinions } from './yarn/opinions.js'
import { opinions as pnpmOpinions } from './pnpm/opinions.js'
/**
 * @import {
 *   HardenDefaultsOptions,
 *   HardenResult,
 *   PrintApi
 * } from "./tools/types.js"
 */

/**
 * Main API: apply hardening defaults to the project at cwd.
 *
 * @param {HardenDefaultsOptions} options
 * @returns {Promise<HardenResult>}
 */
export async function hardenDefaults(options) {
  /** @type {PrintApi} */
  const print = options.print ?? defaultPrint
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
    print(
      `⚠️  Declared package manager (${pmName}) differs from detected (${detected.name}).`
    )
  }

  // Refuse yarn v1
  if (pmName === 'yarn' && isYarnV1(facts)) {
    throw new Error('Yarn v1 is not supported. Please upgrade to Yarn 4.15+.')
  }

  let opinions
  switch (pmName) {
    case 'npm':
      opinions = npmOpinions
      break
    case 'yarn':
      opinions = yarnOpinions
      break
    case 'pnpm':
      opinions = pnpmOpinions
      break
    default:
      throw new Error(`Unsupported package manager: ${pmName}`)
  }

  const result = await applyOpinions(opinions, facts, decisions, print)

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
