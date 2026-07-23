/**
 * @import {
 *   ApplicableOpinion,
 *   Decisions,
 *   Level,
 *   OpinionWithAlternatives,
 *   PrintApi
 * } from "./types.js"
 */
import { levelRank, matchLevel } from './opinions-engine.js'
import { print as defaultPrint } from './print.js'

/**
 * Default non-interactive chooseOpinion:
 *
 * - If the opinion's own level is above the selected level, return null.
 * - Otherwise pick the alternative with the highest level that does not exceed
 *   the selected level. Ties are broken by order (last wins).
 *
 * @param {Level} selected
 * @param {OpinionWithAlternatives} opinion
 * @returns {ApplicableOpinion | null}
 */
function defaultChooseOpinion(selected, opinion) {
  if (!matchLevel(selected, opinion.level)) {
    return null
  }
  let best = /** @type {ApplicableOpinion | null} */ (null)
  let bestRank = -1
  for (const alt of opinion.alternatives) {
    if (matchLevel(selected, alt.level)) {
      const rank = levelRank(alt.level)
      if (rank >= bestRank) {
        bestRank = rank
        best = alt
      }
    }
  }
  return best
}

/**
 * Creates a fallback decisions object that filters opinions by level.
 *
 * @param {object} options
 * @param {Level} options.level
 * @param {PrintApi} [options.print]
 * @param {string} [options.packageManager]
 * @returns {Decisions}
 */
export function createFallbackDecisions({
  level,
  print = defaultPrint,
  packageManager,
}) {
  return {
    async shouldStart(score) {
      const total = score.get('total')
      if (total && total[0] === total[1]) {
        print(
          'All opinions are already fully applied. No hardening should be needed.'
        )
      }
      return true
    },
    async packageManager() {
      return packageManager || null
    },
    async shouldApplyOpinion(opinion, _facts) {
      return matchLevel(level, opinion.level)
    },
    async chooseOpinion(opinion, _facts) {
      return defaultChooseOpinion(level, opinion)
    },
    askToHarden:
      level === 'paranoid'
        ? async (_opinion, _facts) => true
        : async (_opinion, _facts) => false,
    async shouldFollowupCommand(command, _facts) {
      print(`Recommended follow-up command: ${command}`)
      return false
    },
    async showSummary(summary) {
      print('______________________________________________________\n')
      print(summary)
      print('______________________________________________________\n')
      return { exitCode: 0 }
    },
  }
}
