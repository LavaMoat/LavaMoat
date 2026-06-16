/**
 * Escapes a string for use in a RegExp. Uses RegExp.escape() when available
 * (Node.js 24+), otherwise falls back to a manual implementation.
 *
 * @param {string} str
 * @returns {string}
 */
export const escapeRegex =
  // @ts-expect-error -- RegExp.escape is Node 24+
  typeof RegExp.escape === 'function'
    ? // @ts-expect-error -- RegExp.escape is Node 24+
      RegExp.escape
    : (/** @type {string} */ str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
