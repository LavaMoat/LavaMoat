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
 *   Opinion,
 *   PrintApi
 * } from "./types.js"
 */

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
    }
    if (opinion.changes) {
      await verifyOpinion(facts.cwd, opinion, facts).then((ratio) => {
        opinion.detected = ratio
      })
    }
  }
}
