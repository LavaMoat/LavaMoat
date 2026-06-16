import { promisify } from 'node:util'
import child_process from 'node:child_process'
import { applyOpinion } from './apply-change.js'
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
