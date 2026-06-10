import { opinions } from './opinions.js'
import { warnSkipped } from '../tools/print.js'
import { applyOpinion } from '../tools/apply-change.js'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { readYamlDocument } from '../tools/yaml-config.js'
/**
 * @import {
 *   AppliedChange,
 *   Decisions,
 *   Facts
 * } from "../tools/types.js"
 */

/**
 * @param {Facts} facts
 * @param {Decisions} decisions
 * @returns {Promise<AppliedChange[]>}
 */
export async function reasonableDefaults(facts, decisions) {
  const result = []
  const askToHarden =
    decisions.askToHarden ?? ((_opinion, _facts) => Promise.resolve(null))

  for (const opinion of opinions) {
    if (!opinion.changes && !opinion.execute) {
      continue
    }

    const shouldApply = await decisions.shouldApplyOpinion(opinion, facts)
    if (!shouldApply) {
      continue
    }

    try {
      result.push(await applyOpinion(facts.cwd, opinion, facts, askToHarden))
    } catch (err) {
      warnSkipped(opinion, err)
    }
  }

  result.push(await buildAllowlist(facts, decisions))

  return result.flat()
}

/**
 * @param {Facts} facts
 * @param {Decisions} decisions
 * @returns {Promise<AppliedChange[]>}
 */
async function buildAllowlist(facts, decisions) {
  const denyAll =
    decisions.askToHarden &&
    (await decisions.askToHarden(
      {
        description: "Don't approve existing install scripts. ",
      },
      facts
    ))

  // read node_modules/.modules.yaml to list all  packages with lifecycle scripts in pendingBuilds and ignoredBuilds

  const modulesYamlPath = join(facts.cwd, 'node_modules', '.modules.yaml')
  if (!existsSync(modulesYamlPath)) {
    console.warn(
      `No node_modules found. Skipping lifecycle script allowlist generation.`
    )
    return []
  }
  const modulesYaml = await readYamlDocument(modulesYamlPath)
  const pendingBuilds = modulesYaml.get('pendingBuilds')?.toJSON() ?? []
  const ignoredBuilds = modulesYaml.get('ignoredBuilds')?.toJSON() ?? []
  const allBuilds = [...pendingBuilds, ...ignoredBuilds]

  if (!denyAll) {
    console.log(`Approved packages with lifecycle scripts: [${allBuilds}] .`)
  }

  // put the list of packages with lifecycle scripts in the allowlist in pnpm-workspace.yaml
  const allowlist = Object.fromEntries(allBuilds.map((pkg) => [pkg, !denyAll]))

  return applyOpinion(
    facts.cwd,
    {
      description: `Set allowBuilds in pnpm-workspace.yaml to allowlisted packages with lifecycle scripts.`,
      changes: [
        {
          target: 'pnpm-workspace.yaml',
          key: 'allowBuilds',
          value: allowlist,
          comment:
            'List of packages with lifecycle scripts that are allowed to run.',
        },
      ],
    },
    facts,
    () => Promise.resolve(true)
  )
}
