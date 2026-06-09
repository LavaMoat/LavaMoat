// @ts-check
import { collectFacts, detectPackageManager, isYarnV1 } from './tools/detect.js'
import { reasonableDefaults as npmDefaults } from './npm/index.js'
import { reasonableDefaults as yarnDefaults } from './yarn/index.js'
import { reasonableDefaults as pnpmDefaults } from './pnpm/index.js'

/**
 * @typedef {'baseline' | 'moderate' | 'strict'} Level
 */

/**
 * @typedef {{
 *   shouldApplyOpinion: (
 *     opinion: import('./opinions.js').Opinion,
 *     facts: import('./tools/detect.js').Facts
 *   ) => Promise<boolean>
 *   packageManager?: () => Promise<string | null>
 * }} Decisions
 */

/**
 * Main API: apply hardening defaults to the project at cwd.
 *
 * @param {object} options
 * @param {string} options.cwd
 * @param {string} [options.packageManager] - Override detected PM
 * @param {Decisions} options.decisions
 * @returns {Promise<{
 *   result: { file: string; key: string }[]
 *   summary: string
 * }>}
 */
export async function hardenDefaults(options) {
  const { cwd, decisions } = options

  const facts = await collectFacts(cwd)
  let detected = detectPackageManager(facts)

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
    console.warn(
      `⚠️  Declared package manager (${pmName}) differs from detected (${detected.name}).`
    )
  }

  // Refuse yarn v1
  if (pmName === 'yarn' && isYarnV1(facts)) {
    throw new Error('Yarn v1 is not supported. Please upgrade to Yarn 4.15+.')
  }

  switch (pmName) {
    case 'npm':
      return npmDefaults(facts, decisions)
    case 'yarn':
      return yarnDefaults(facts, decisions)
    case 'pnpm':
      return pnpmDefaults(facts, decisions)
    default:
      throw new Error(`Unsupported package manager: ${pmName}`)
  }
}
