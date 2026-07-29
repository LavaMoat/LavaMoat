/**
 * @import {
 *   ApplicableOpinion,
 *   Decisions,
 *   Facts,
 *   Opinion
 * } from './types.js'
 */

/**
 * Returns the opinions that should be applied according to the given decisions.
 *
 * - Opinions with `alternatives` are resolved via `decisions.chooseOpinion`; if
 *   that function is absent or returns `null`, the opinion is skipped.
 * - Plain opinions (no alternatives) are filtered via
 *   `decisions.shouldApplyOpinion` and must have at least `changes` or
 *   `execute` to be eligible.
 *
 * @param {readonly Opinion[]} opinions
 * @param {Decisions} decisions
 * @param {Facts} facts
 * @returns {AsyncGenerator<ApplicableOpinion>}
 */
export async function* filterOpinions(opinions, decisions, facts) {
  for (const opinion of opinions) {
    if (opinion.alternatives) {
      if (decisions.chooseOpinion) {
        const chosen = await decisions.chooseOpinion(opinion, facts)
        if (chosen) {
          yield chosen
        }
      }
    } else {
      if (await decisions.shouldApplyOpinion(opinion, facts)) {
        yield opinion
      }
    }
  }
}
