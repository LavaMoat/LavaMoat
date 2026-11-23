/**
 * Provides {@link jsonStringifySortedPolicy}.
 *
 * @packageDocumentation
 */

import jsonStringify from 'json-stable-stringify'
import type { LavaMoatPolicy } from '@lavamoat/types'

type Comparator = Parameters<typeof jsonStringify>[1] extends
  | { cmp?: infer C }
  | undefined
  ? NonNullable<C>
  : never

/**
 * Comparator that sorts policy keys in a diff-friendly way.
 *
 * Keys containing `>` (canonical package name separators) are sorted by
 * reversing the segments, so that sibling packages sort near each other rather
 * than by their root name.
 *
 * @internal
 */
const diffFriendlyPolicyKeysComparator: Comparator = (
  { key: rawA },
  { key: rawB }
) => {
  if (rawA === rawB) return 0
  const a = rawA.includes('>') ? rawA.split('>').reverse().join('<') : rawA
  const b = rawB.includes('>') ? rawB.split('>').reverse().join('<') : rawB
  return a < b ? -1 : 1
}

/**
 * Stringifies a LavaMoat policy to a stable, diff-friendly JSON string.
 *
 * Keys are sorted such that sibling packages appear together, making policy
 * diffs easier to review.
 *
 * @param policy - The policy (or debug policy) to stringify
 * @returns Stable JSON string with 2-space indentation
 * @throws {TypeError} If `json-stable-stringify` unexpectedly returns
 *   `undefined`
 *
 * @example
 * ```ts
 * const json = jsonStringifySortedPolicy(policy)
 * await fs.writeFile('policy.json', json)
 * ```
 */
export function jsonStringifySortedPolicy(policy: LavaMoatPolicy): string {
  const result = jsonStringify(policy, {
    space: 2,
    cmp: diffFriendlyPolicyKeysComparator,
  })
  if (result === undefined) {
    throw new TypeError('Failed to stringify policy')
  }
  return result
}
