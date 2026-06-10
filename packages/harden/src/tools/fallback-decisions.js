/**
 * @import {
 *   Decisions,
 *   Level
 * } from "./types.js"
 */

const LEVEL_ORDER = /** @type {const} */ (['baseline', 'moderate', 'paranoid'])

/**
 * @param {Level} selected
 * @param {Level} [opinionLevel]
 */
function levelIncludes(selected, opinionLevel) {
  if (!opinionLevel) {
    return true
  }
  return LEVEL_ORDER.indexOf(opinionLevel) <= LEVEL_ORDER.indexOf(selected)
}

/**
 * Creates a fallback decisions object that filters opinions by level.
 *
 * @param {Level} level
 * @returns {Decisions}
 */
export function createFallbackDecisions(level) {
  return {
    async shouldApplyOpinion(opinion, _facts) {
      return levelIncludes(level, opinion.level)
    },
    askToHarden:
      level === 'paranoid'
        ? async (_opinion, _facts) => true
        : async (_opinion, _facts) => false,
  }
}
