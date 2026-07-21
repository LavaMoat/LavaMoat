import { promisify } from 'node:util'
import child_process from 'node:child_process'
import { applyOpinion, verifyOpinion } from './apply-change.js'
import { filterOpinions } from './filter-opinions.js'
const exec = promisify(child_process.exec)
/**
 * @import {
 *   AppliedChange,
 *   Decisions,
 *   Facts,
 *   Level,
 *   Opinion,
 *   PrintApi
 * } from "./types.js"
 */

const LEVEL_ORDER = /** @type {const} */ (['baseline', 'moderate', 'paranoid'])

/**
 * Returns true when `opinionLevel` is at or below `selected` in LEVEL_ORDER. An
 * absent `opinionLevel` always matches.
 *
 * @param {Level} selected
 * @param {Level} [opinionLevel]
 */
export function matchLevel(selected, opinionLevel) {
  if (!opinionLevel) {
    return true
  }
  return LEVEL_ORDER.indexOf(opinionLevel) <= LEVEL_ORDER.indexOf(selected)
}

/**
 * Rank of a level within LEVEL_ORDER. An absent level ranks as 0 (baseline).
 *
 * @param {Level} [opinionLevel]
 */
export function levelRank(opinionLevel) {
  return opinionLevel ? LEVEL_ORDER.indexOf(opinionLevel) : 0
}

/**
 * Apply the selected opinions and optionally run recommended follow-up
 * commands.
 *
 * @param {readonly Opinion[]} opinions
 * @param {Facts} facts
 * @param {Decisions} decisions
 * @param {PrintApi} print
 * @returns {Promise<AppliedChange[]>}
 */
export async function applyOpinions(opinions, facts, decisions, print) {
  const result = []
  const recommendedCommands = new Set()

  for (const opinion of await filterOpinions(opinions, decisions, facts)) {
    try {
      result.push(
        await applyOpinion(facts.cwd, opinion, facts, decisions, print)
      )
      for (const command of opinion.recommendCommands ?? []) {
        recommendedCommands.add(command)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      print(`⚠️  ${opinion.description}: ${message}`)
    }
  }

  if (decisions.shouldFollowupCommand) {
    for (const command of recommendedCommands) {
      if (await decisions.shouldFollowupCommand(command, facts)) {
        await exec(command, { cwd: facts.cwd })
      }
    }
  }

  return result.flat()
}

/**
 * Recursively validates opinions by checking if their changes are already
 * applied in the given facts. Decorates each opinion with a `detected` property
 * that is set to the ratio of applied changes to total changes (a number
 * between 0 and 1
 *
 * @param {readonly Opinion[]} opinions
 * @param {Facts} facts
 * @returns {Promise<void>}
 */
export async function validateOpinions(opinions, facts) {
  // for each opinion and its alternatives, check if changes it contains are already applied in facts.
  // - decorate each opinion with `detected` property that is set to applied/all changes number
  for (const opinion of opinions) {
    if (opinion.alternatives) {
      await validateOpinions(opinion.alternatives, facts)
      opinion.detected = Math.max(
        ...opinion.alternatives.map((o) => o.detected ?? 0)
      )
    } else if (opinion.changes || opinion.verify) {
      await verifyOpinion(facts.cwd, opinion, facts).then((ratio) => {
        opinion.detected = ratio
      })
    }
  }
}
