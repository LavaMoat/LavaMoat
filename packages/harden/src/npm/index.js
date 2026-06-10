import { opinions } from './opinions.js'
import { warnSkipped } from '../tools/print.js'
import { applyOpinion } from '../tools/apply-change.js'
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

  return result.flat()
}
