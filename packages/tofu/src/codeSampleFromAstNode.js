// @ts-check

module.exports = { codeSampleFromAstNode }
/**
 * @import {NodeWithLocation} from './types'
 */


// dumbed down the types to avoid circular dep on @lavamoat/types or lavamoat-core
/**
 * @deprecated - moved to lavamoat-core - use the same function from there for better types
 * @param {NodeWithLocation} node
 * @param {{content: string|undefined}} moduleRecord
 * @returns {{ range: string; sample: string }}
 */
function codeSampleFromAstNode(node, moduleRecord) {
  const result = {}
  const { content } = moduleRecord
  const { start, end } = node.loc
  result.range = `${start.line}:${start.column}`
  if (end) {
    result.range += `,${end.line}:${end.column}`
  }
  // prepare sample
  const lines = /** @type {string} */ (content).split('\n')
  const startLine = lines[start.line - 1]
  const sample = startLine.slice(start.column, start.column + 70)
  result.sample = sample
 
  return result
}
