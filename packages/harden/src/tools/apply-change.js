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
 *   (
 *     cwd: string,
 *     entries: Change[],
 *     dryRun?: boolean
 *   ) => Promise<AppliedChange[]>
 * >}
 */
const configAppliers = {
  '.npmrc': applyNpmrc,
  '.yarnrc': applyLegacyYarnrc,
  '.yarnrc.yml': (cwd, entries, dryRun) =>
    applyYamlConfig(cwd, '.yarnrc.yml', entries, dryRun),
  'pnpm-workspace.yaml': (cwd, entries, dryRun) =>
    applyYamlConfig(cwd, 'pnpm-workspace.yaml', entries, dryRun),
  'package.json': applyPackageJson,
  '/lavamoat': applyLavamoatFolder,
}

/**
 * Applies a single change to the appropriate config file or package.json.
 *
 * @param {object} params
 * @param {string} params.cwd
 * @param {Change} params.change
 * @param {boolean} [params.dryRun=false] If true, does not actually write any
 *   files, just returns the changes that would be made. Default is `false`
 * @returns {Promise<AppliedChange[]>}
 */
async function applyChange({ cwd, change, dryRun = false }) {
  const applier = configAppliers[change.target]
  if (!applier) throw new Error(`Unknown change target: ${change.target}`)
  return applier(cwd, [change], dryRun)
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
    result.push(await applyChange({ cwd, change }))
  }
  return result.flat()
}

/**
 * Checks whether changes contained in an opinion are applied already. returns a
 * number between 0 and 1 representing the ratio of applied changes to total
 * changes.
 *
 * @param {string} cwd
 * @param {ApplicableOpinion} opinion
 * @param {Facts} facts
 * @returns {Promise<number>}
 */
export async function verifyOpinion(cwd, opinion, facts) {
  const changes = opinion.changes ? structuredClone(opinion.changes) : []

  if (!changes) {
    return 0 // if there are no changes or custom verifier, consider the opinion NOT applied
  }
  const result = []
  for (const change of changes) {
    result.push(...(await applyChange({ cwd, change, dryRun: true })))
  }

  if (opinion.verify) {
    return (await opinion.verify(changes, result, facts)) ? 1 : 0
  }

  return 1 - result.length / changes.length
}
