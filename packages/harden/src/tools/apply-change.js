import { applyNpmrc } from './npmrc.js'
import { applyYamlConfig } from './yaml-config.js'
import { applyPackageJson } from './packagejson.js'
import { applyLegacyYarnrc } from './legacyYarnrc.js'
import { applyLavamoatFolder } from './lavamoat-folder.js'
/**
 * @import {
 *   ApplicableOpinion,
 *   AppliedChange,
 *   Change,
 *   ChangeTarget,
 *   Decisions,
 *   Facts,
 *   PrintApi
 * } from "./types.js"
 */

/**
 * @type {Record<
 *   ChangeTarget,
 *   (cwd: string, entries: Change[]) => Promise<AppliedChange[]>
 * >}
 */
const configAppliers = {
  '.npmrc': applyNpmrc,
  '.yarnrc': applyLegacyYarnrc,
  '.yarnrc.yml': (cwd, entries) => applyYamlConfig(cwd, '.yarnrc.yml', entries),
  'pnpm-workspace.yaml': (cwd, entries) =>
    applyYamlConfig(cwd, 'pnpm-workspace.yaml', entries),
  'package.json': applyPackageJson,
  '/lavamoat': applyLavamoatFolder,
}

/**
 * Applies a single change to the appropriate config file or package.json.
 *
 * @param {string} cwd
 * @param {Change} change
 * @returns {Promise<AppliedChange[]>}
 */
async function applyChange(cwd, change) {
  const applier = configAppliers[change.target]
  if (!applier) throw new Error(`Unknown change target: ${change.target}`)
  return applier(cwd, [change])
}

/**
 * Resolves and applies all changes for a single opinion, including running its
 * execute function if present.
 *
 * @param {string} cwd
 * @param {ApplicableOpinion} opinion
 * @param {Facts} facts
 * @param {Decisions} decisions
 * @param {PrintApi} print
 * @returns {Promise<AppliedChange[]>}
 */
export async function applyOpinion(cwd, opinion, facts, decisions, print) {
  // make a copy of declared changes
  let changes = opinion.changes ? structuredClone(opinion.changes) : []

  if (opinion.execute) {
    const modified = await opinion.execute(changes, facts, decisions, print)
    if (modified !== undefined) {
      changes = modified
    }
  }

  const result = []
  for (const change of changes) {
    result.push(await applyChange(cwd, change))
  }
  return result.flat()
}
