import { opinions } from './opinions.js'
import { warnSkipped } from '../tools/print.js'
import { applyOpinion } from '../tools/apply-change.js'
import { filterOpinions } from '../tools/filter-opinions.js'
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

  for (const opinion of await filterOpinions(opinions, decisions, facts)) {
    try {
      result.push(await applyOpinion(facts.cwd, opinion, facts, decisions))
    } catch (err) {
      warnSkipped(opinion, err)
    }
  }

  return result.flat()
}
