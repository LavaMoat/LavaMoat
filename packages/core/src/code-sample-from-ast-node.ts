/**
 * Provides {@link codeSampleFromAstNode}.
 *
 * @packageDocumentation
 */

import type { NodeWithLocation } from 'lavamoat-tofu'
import type { LavamoatModuleRecord } from '@lavamoat/types'

/**
 * Result returned by {@link codeSampleFromAstNode}.
 */
export interface CodeSampleResult {
  /**
   * Source range as `startLine:startColumn[,endLine:endColumn]`.
   */
  range: string
  /**
   * Up to 70 characters of source code starting at the node's column position.
   */
  sample: string
}

/**
 * Extracts a human-readable location and source sample from an AST node and
 * its containing module record.
 *
 * Used when generating policy to point developers at the specific expression
 * that triggered a policy entry.
 *
 * @param node - AST node with location information
 * @param moduleRecord - The module record containing the source code
 * @returns Object with `range` (line:col string) and `sample` (source snippet)
 */
export function codeSampleFromAstNode(
  node: NodeWithLocation,
  moduleRecord: Pick<LavamoatModuleRecord, 'content'>
): CodeSampleResult {
  const { content } = moduleRecord
  const { start, end } = node.loc
  let range = `${start.line}:${start.column}`
  if (end) {
    range += `,${end.line}:${end.column}`
  }
  const lines = (content as string).split('\n')
  const startLine = lines[start.line - 1]
  const sample = startLine.slice(start.column, start.column + 70)
  return { range, sample }
}
