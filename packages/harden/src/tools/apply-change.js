import { applyNpmrc } from './npmrc.js'
import { applyYamlConfig } from './yaml-config.js'
import { applyPackageJson } from './packagejson.js'
/**
 * @import {
 *   AppliedChange,
 *   Change,
 *   ChangeResult,
 *   Facts,
 *   Opinion
 * } from "./types.js"
 */

/**
 * @type {Record<
 *   string,
 *   {
 *     configFile: string
 *     applyConfig: (cwd: string, entries: Change[]) => Promise<ChangeResult[]>
 *   }
 * >}
 */
const pmConfig = {
  npm: {
    configFile: '.npmrc',
    applyConfig: applyNpmrc,
  },
  yarn: {
    configFile: '.yarnrc.yml',
    applyConfig: (cwd, entries) => applyYamlConfig(cwd, '.yarnrc.yml', entries),
  },
  pnpm: {
    configFile: 'pnpm-workspace.yaml',
    applyConfig: (cwd, entries) =>
      applyYamlConfig(cwd, 'pnpm-workspace.yaml', entries),
  },
}

/**
 * Applies a single change to the appropriate config file or package.json.
 *
 * @param {string} cwd
 * @param {string} pmName
 * @param {Change} change
 * @returns {Promise<AppliedChange[]>}
 */
async function applyChange(cwd, pmName, change) {
  if (change.target === 'package.json') {
    const entries = await applyPackageJson(cwd, [change])
    return entries.map(({ key, value }) => ({
      file: 'package.json',
      key,
      value,
    }))
  }

  const pm = pmConfig[pmName]
  if (!pm) throw new Error(`Unknown package manager: ${pmName}`)
  const entries = await pm.applyConfig(cwd, [change])
  return entries.map(({ key, value }) => ({ file: pm.configFile, key, value }))
}

/**
 * Resolves and applies all changes for a single opinion, including running its
 * execute function if present.
 *
 * @param {string} cwd
 * @param {string} pmName
 * @param {Opinion} opinion
 * @param {Facts} facts
 * @param {(opinion: Opinion, facts: Facts) => Promise<boolean | null>} askToHarden
 * @returns {Promise<AppliedChange[]>}
 */
export async function applyOpinion(cwd, pmName, opinion, facts, askToHarden) {
  // make a copy of declared changes
  let changes = opinion.changes ? structuredClone(opinion.changes) : []

  if (opinion.execute) {
    const modified = await opinion.execute(changes, facts, askToHarden)
    if (modified !== undefined) {
      changes = modified
    }
  }

  const result = []
  for (const change of changes) {
    result.push(await applyChange(cwd, pmName, change))
  }
  return result.flat()
}
