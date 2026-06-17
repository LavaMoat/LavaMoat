import { collectFacts, detectPackageManager, isYarnV1 } from './tools/detect.js'
import { print as defaultPrint } from './tools/print.js'
import { applyOpinions, validateOpinions } from './tools/opinions-engine.js'

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

  await validateOpinions(opinions, facts)

  /** @type {Map<string, number[]>} */
  const score = new Map()
  const total = [0, 0]
  for (const opinion of opinions) {
    if (!score.has(opinion.level)) {
      score.set(opinion.level, [])
    }
    // @ts-expect-error - I just checked...
    score.get(opinion.level).push(opinion.detected ?? 0)
  }
  for (const [level, values] of score) {
    const s = values.reduce((acc, x) => acc + x, 0)
    score.set(level, [s, values.length])
    total[0] += s
    total[1] += values.length
  }
  score.set('total', total)
  if (decisions.shouldStart) {
    const shouldStart = await decisions.shouldStart(score)
    if (!shouldStart) {
      return {
        result: [],
        summary: 'Hardening skipped.',
      }
    }
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
        result
          .map((r) => {
            if (typeof r.value === 'object') {
              return `  ✓ ${r.file}: ${r.key} created`
            }
            return `  ✓ ${r.file}: ${r.key} -> ${r.value}`
          })
          .join('\n')

  return { result, summary }
}
