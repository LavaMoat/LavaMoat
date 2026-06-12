import { opinions } from './opinions.js'
import { warnSkipped } from '../tools/print.js'
import { applyOpinion } from '../tools/apply-change.js'
import {
  ensureWorkspaceInitialized,
  findPackagesWithScripts,
} from './internals.js'
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
      throw Error(
        `Opinion ${opinion.description} has no changes or execute function.`
      )
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
 * Build the allowlist for approved lifecycle scripts. Yarn uses
 * `dependenciesMeta` in package.json to control which packages are allowed to
 * run install scripts.
 *
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

  if (!facts.hasYarnState) {
    if (denyAll) {
      return []
    } else {
      ensureWorkspaceInitialized(facts)
    }
  }

  const allBuilds = await findPackagesWithScripts(facts)

  if (!denyAll) {
    console.log(
      `Approved packages with lifecycle scripts: [${allBuilds.map((pkg) => pkg.name).join(', ')}] .`
    )
  }

  if (allBuilds.length === 0) {
    return []
  }

  // put the list of packages with lifecycle scripts in dependenciesMeta in package.json
  const dependenciesMeta = Object.fromEntries(
    allBuilds.map((pkg) => [pkg.name, { built: !denyAll }])
  )

  return applyOpinion(
    facts.cwd,
    {
      description: `Set dependenciesMeta in package.json to allowlisted packages with lifecycle scripts.`,
      changes: [
        {
          target: 'package.json',
          key: 'dependenciesMeta',
          value: dependenciesMeta,
          comment:
            'List of packages with lifecycle scripts that are allowed to run.',
        },
      ],
    },
    facts,
    () => Promise.resolve(true)
  )
}
