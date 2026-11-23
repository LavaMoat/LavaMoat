/**
 * Provides {@link compactPolicyOverride}.
 *
 * @packageDocumentation
 */

import type { LavaMoatPolicy, ResourcePolicy, Resources } from '@lavamoat/types'

const { entries, keys } = Object

/**
 * Result of {@link compactPolicyOverride}.
 */
export interface CompactResult {
  /** Compacted policy override */
  policy: LavaMoatPolicy
  /** `true` if at least one redundant entry was removed */
  compacted: boolean
}

/**
 * Returns a compacted copy of `policyOverride` with any entries in `resources`
 * that are already fully covered by `policy` removed, together with a flag
 * indicating whether anything was actually removed.
 *
 * Only the `resources` field is examined for redundancy. All other fields
 * (`include`, `root`, `resolutions`, etc.) are passed through unchanged because
 * policy generation never produces them independently of overrides.
 *
 * Subfields `meta` and `native` are not examined for redundancy, since policy
 * generation never produces them independently of overrides.
 *
 * A key–value pair in `policyOverride.resources[name].<field>[k]` is considered
 * redundant when the corresponding entry in `policy.resources[name].<field>[k]`
 * exists and has the same value.
 *
 * `resources` is always present on the result (as `{}` at minimum) because the
 * schema requires it.
 *
 * @param policyOverride - The policy override to compact
 * @param policy - The un-merged generated policy to compare against
 * @returns Compacted policy override and whether any changes were made
 *
 * @example
 * ```ts
 * const { policy: compacted, compacted: changed } = compactPolicyOverride(override, base)
 * if (changed) await fs.writeFile('policy-override.json', jsonStringifySortedPolicy(compacted))
 * ```
 */
export function compactPolicyOverride(
  policyOverride: LavaMoatPolicy,
  policy: LavaMoatPolicy
): CompactResult {
  const compactedResources: Resources = {}
  let compacted = false

  for (const [name, overrideResource] of entries(policyOverride.resources)) {
    const baseResource = policy.resources[name]

    const compactedResource: ResourcePolicy = {}

    // globals / builtin / packages: scalar map fields
    for (const field of ['globals', 'builtin', 'packages'] as const) {
      const overrideField = overrideResource[field]
      if (!overrideField) continue
      const compactedField: Record<string, unknown> = {}
      for (const [k, v] of entries(overrideField)) {
        if (baseResource?.[field]?.[k] !== v) {
          compactedField[k] = v
        } else {
          compacted = true
        }
      }
      if (keys(compactedField).length > 0) {
        // @ts-expect-error - dynamic field assignment keyed by field name
        compactedResource[field] = compactedField
      }
    }

    // native: scalar boolean — always pass through
    if ('native' in overrideResource) {
      compactedResource.native = overrideResource.native
    }

    // meta: always pass through
    if ('meta' in overrideResource) {
      compactedResource.meta = { ...overrideResource.meta }
    }

    // Only keep the resource entry if it has remaining fields
    if (keys(compactedResource).length > 0) {
      compactedResources[name] = compactedResource
    }
  }

  // resources is required by schema; pass through all non-resources fields unchanged
  const { resources: _overrideResources, ...rest } = policyOverride
  return { policy: { ...rest, resources: compactedResources }, compacted }
}
