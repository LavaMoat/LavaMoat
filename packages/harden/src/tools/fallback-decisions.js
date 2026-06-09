// @ts-check

const LEVEL_ORDER = /** @type {const} */ (['baseline', 'moderate', 'strict'])

/**
 * @param {import('../index.js').Level} selected
 * @param {import('../index.js').Level} opinionLevel
 */
function levelIncludes(selected, opinionLevel) {
  return LEVEL_ORDER.indexOf(opinionLevel) <= LEVEL_ORDER.indexOf(selected)
}

/**
 * Creates a fallback decisions object that filters opinions by level.
 *
 * @param {import('../index.js').Level} level
 * @returns {import('../index.js').Decisions}
 */
export function createFallbackDecisions(level) {
  return {
    async shouldApplyOpinion(opinion, _facts) {
      return levelIncludes(level, opinion.level)
    },
  }
}
