// @ts-check
import { opinions } from '../opinions.js'
import { applyYamlConfig } from '../tools/yaml-config.js'
import { applyPackageJson } from '../tools/packagejson.js'

/**
 * @param {import('../tools/detect.js').Facts} facts
 * @param {{
 *   shouldApplyOpinion: (
 *     opinion: import('../opinions.js').Opinion,
 *     facts: import('../tools/detect.js').Facts
 *   ) => Promise<boolean>
 * }} decisions
 * @returns {Promise<{
 *   result: { file: string; key: string }[]
 *   summary: string
 * }>}
 */
export async function reasonableDefaults(facts, decisions) {
  const result = []

  for (const opinion of opinions) {
    if (opinion.applicableTo && !opinion.applicableTo.includes('yarn')) {
      continue
    }
    if (!opinion.changes && !opinion.execute) {
      continue
    }

    const shouldApply = await decisions.shouldApplyOpinion(opinion, facts)
    if (!shouldApply) {
      continue
    }

    let changes = opinion.changes ?? {}

    if (opinion.execute) {
      try {
        const modified = opinion.execute(changes, facts)
        if (modified !== undefined) {
          changes = modified
        }
      } catch (err) {
        console.warn(`⚠️  ${opinion.description}: ${err.message}`)
        continue
      }
    }

    if (changes.yarn) {
      const changed = await applyYamlConfig(
        facts.cwd,
        '.yarnrc.yml',
        changes.yarn
      )
      for (const key of changed) {
        result.push({ file: '.yarnrc.yml', key })
      }
    }

    if (changes.packagejson) {
      const changed = await applyPackageJson(facts.cwd, changes.packagejson)
      for (const key of changed) {
        result.push({ file: 'package.json', key })
      }
    }
  }

  const summary =
    result.length === 0
      ? 'No changes needed — config already hardened.'
      : 'Applied hardening changes:\n' +
        result.map((r) => `  ✓ ${r.file}: ${r.key}`).join('\n')

  return { result, summary }
}
