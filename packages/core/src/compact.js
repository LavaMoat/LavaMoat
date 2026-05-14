// @ts-check
/**
 * Provides {@link compactPolicyOverride}
 *
 * @module
 */

/**
 * @import {
 *   LavaMoatPolicy,
 *   ResourcePolicy,
 *   Resources
 * } from "@lavamoat/types"
 */

const { entries, keys } = Object

/**
 * Returns a compacted copy of `policyOverride` with any entries in `resources`
 * that are already fully covered by `policy` removed.
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
 * @param {LavaMoatPolicy} policyOverride The policy override to compact
 * @param {LavaMoatPolicy} policy The un-merged generated policy to compare
 *   against
 * @returns {LavaMoatPolicy} Compacted policy override
 * @public
 */
module.exports.compactPolicyOverride = (policyOverride, policy) => {
  /** @type {Resources} */
  const compactedResources = {}

  for (const [name, overrideResource] of Object.entries(
    policyOverride.resources
  )) {
    const baseResource = policy.resources[name]

    /** @type {ResourcePolicy} */
    const compactedResource = {}

    // globals / builtin / packages: scalar map fields
    for (const field of /** @type {const} */ ([
      'globals',
      'builtin',
      'packages',
    ])) {
      const overrideField = overrideResource[field]
      if (!overrideField) continue
      /** @type {Record<string, unknown>} */
      const compacted = {}
      for (const [k, v] of entries(overrideField)) {
        if (baseResource?.[field]?.[k] !== v) {
          compacted[k] = v
        }
      }
      if (keys(compacted).length > 0) {
        // @ts-expect-error - dynamic field assignment keyed by field name
        compactedResource[field] = compacted
      }
    }

    // native: scalar boolean
    if ('native' in overrideResource) {
      compactedResource.native = overrideResource.native
    }

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
  return { ...rest, resources: compactedResources }
}
