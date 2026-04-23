// @ts-check

/**
 * Provides {@link mergePolicy} for merging LavaMoat policies.
 *
 * @packageDocumentation
 */

const {
  reduceToTopmostApiCalls,
  validateHierarchy,
  objToMap,
  mapToObj,
} = require('lavamoat-tofu/src/util')
const { entries, keys } = Object

/**
 * @import {LavaMoatPolicy,
 *   GlobalPolicy,
 *   BuiltinPolicy,
 *   ResourcePolicy,
 *   Resources,
 *   Resolutions,
 *   LavaMoatPolicyDebug} from '@lavamoat/types'
 */

/**
 * Options for {@link dedupePolicyPaths}.
 *
 * @template {BuiltinPolicy | GlobalPolicy} PolicyItems Type of policy items
 * @typedef {Object} DedupePolicyPathsOptions
 * @property {PolicyItems} policyItems - The primary policy
 * @property {PolicyItems} [overrideItems] - Optional override items
 * @property {string} resourceId - The resource identifier
 */

/**
 * Dedupe {@link BuiltinPolicy} paths.
 *
 * @overload
 * @param {DedupePolicyPathsOptions<BuiltinPolicy>} params
 * @returns {BuiltinPolicy}
 */

/**
 * Dedupe {@link GlobalPolicy} paths.
 *
 * @overload
 * @param {DedupePolicyPathsOptions<GlobalPolicy>} params
 * @returns {GlobalPolicy}
 */

/**
 * Dedupe policy paths by removing nested paths and adding back in paths
 * explicitly allowed in overrides.
 *
 * @template {BuiltinPolicy | GlobalPolicy} PolicyItems Type of policy items
 * @param {DedupePolicyPathsOptions<PolicyItems>} params
 */
const dedupePolicyPaths = ({ policyItems, overrideItems, resourceId }) => {
  const itemMap = /** @type {Map<string, PolicyItems[keyof PolicyItems]>} */ (
    objToMap(policyItems)
  )

  reduceToTopmostApiCalls(itemMap)

  // After we've removed all nesting to ensure denying a top-level field denies
  // all generated sub-fields, we need to add back in the sub-fields explicitly
  // allowed in overrides.
  if (overrideItems) {
    entries(overrideItems).forEach(([path, value]) => {
      if (value !== false && !itemMap.has(path)) {
        itemMap.set(path, /** @type {PolicyItems[keyof PolicyItems]} */ (value))
      }
    })
  }

  const violations = validateHierarchy(itemMap)
  if (violations.length > 0) {
    const violationMessages = violations.map(({ path, parent }) => {
      return `"${path}" is invalid when "${parent}" is also present in policy"`
    })
    throw new Error(
      `LavaMoat - Policy hierarchy validation failed for resource "${resourceId}"
  ${violationMessages.join('\n  ')}
You could set the parent "${violations[0].parent}" to false if you intended to override to a less permissive policy.`
    )
  }

  return mapToObj(itemMap)
}

/**
 * Merges two {@link ResourcePolicy} objects.
 *
 * Dict-valued fields (`globals`, `builtin`, `packages`, `meta`) are
 * shallow-merged with `resourcesB` taking precedence. Scalar fields (`native`)
 * use `resourcesB`'s value when present.
 *
 * @param {ResourcePolicy} policyResources Resource policy
 * @param {ResourcePolicy} policyOverrideResources Resource policy overrides
 * @returns {ResourcePolicy} Merged resource policy
 */
const mergeResourcePolicy = (policyResources, policyOverrideResources) => {
  /** @type {ResourcePolicy} */
  const result = {}

  if (policyResources.globals || policyOverrideResources.globals) {
    result.globals = {
      ...policyResources.globals,
      ...policyOverrideResources.globals,
    }
  }
  if (policyResources.builtin || policyOverrideResources.builtin) {
    result.builtin = {
      ...policyResources.builtin,
      ...policyOverrideResources.builtin,
    }
  }
  if (policyResources.packages || policyOverrideResources.packages) {
    result.packages = {
      ...policyResources.packages,
      ...policyOverrideResources.packages,
    }
  }
  if (policyResources.meta || policyOverrideResources.meta) {
    result.meta = { ...policyResources.meta, ...policyOverrideResources.meta }
  }
  if ('native' in policyOverrideResources) {
    result.native = policyOverrideResources.native
  } else if ('native' in policyResources) {
    result.native = policyResources.native
  }

  if ('env' in policyOverrideResources) {
    // @ts-expect-error - env is undocumented
    result.env = policyOverrideResources.env
  } else if ('env' in policyResources) {
    // @ts-expect-error - env is undocumented
    result.env = policyResources.env
  }

  // capabilities: merge per name.
  // `capabilities: false` in override clears all base capabilities.
  // Otherwise: base entries not mentioned in override are kept; override entries
  // with value `false` remove the matching base entry; any other override value
  // replaces or adds the entry.
  if ('capabilities' in policyOverrideResources) {
    const overrideCaps = policyOverrideResources.capabilities
    if (overrideCaps === false) {
      // explicitly cleared
    } else {
      const merged = { ...(policyResources.capabilities ?? {}) }
      for (const [name, value] of Object.entries(overrideCaps ?? {})) {
        if (value === false) {
          delete merged[name]
        } else {
          merged[name] = value
        }
      }
      result.capabilities = merged
    }
  } else if ('capabilities' in policyResources) {
    result.capabilities = { ...policyResources.capabilities }
  }

  return result
}

/**
 * Merges the {@link LavaMoatPolicy.resources} fields of two policies.
 *
 * Mutates {@link mergedPolicy} in place.
 *
 * @param {LavaMoatPolicy} policy Policy
 * @param {LavaMoatPolicy} policyOverride Policy overrides
 * @param {LavaMoatPolicy} mergedPolicy Merged policy
 * @returns {void}
 */
const mergeResourcePolicies = (policy, policyOverride, mergedPolicy) => {
  const { resources: resourcesA = {} } = policy
  const { resources: resourcesB = {} } = policyOverride
  const allResourceNames = new Set([...keys(resourcesA), ...keys(resourcesB)])

  /** @type {Resources} */
  const resources = {}
  for (const name of allResourceNames) {
    const resourceA = resourcesA[name]
    const resourceB = resourcesB[name]
    const merged =
      resourceA && resourceB
        ? mergeResourcePolicy(resourceA, resourceB)
        : { ...(resourceB ?? resourceA) }
    if (merged.globals) {
      merged.globals = dedupePolicyPaths({
        policyItems: merged.globals,
        overrideItems: resourceB?.globals,
        resourceId: name,
      })
    }
    if (merged.builtin) {
      merged.builtin = dedupePolicyPaths({
        policyItems: merged.builtin,
        overrideItems: resourceB?.builtin,
        resourceId: name,
      })
    }
    resources[name] = merged
  }

  mergedPolicy.resources = resources
}

/**
 * Merges the {@link LavaMoatPolicy.include} fields of two policies.
 *
 * Mutates {@link mergedPolicy} in place.
 *
 * @param {LavaMoatPolicy} policy Policy
 * @param {LavaMoatPolicy} policyOverride Policy overrides
 * @param {LavaMoatPolicy} mergedPolicy Merged policy
 * @returns {void}
 */
const mergeInclude = (policy, policyOverride, mergedPolicy) => {
  if (policy.include || policyOverride.include) {
    /** @type {NonNullable<LavaMoatPolicy['include']>} */
    const combined = [
      ...(policy.include ?? []),
      ...(policyOverride.include ?? []),
    ]

    /** @type {Set<string>} */
    const seenStrings = new Set()
    /** @type {Map<string, Set<string>>} */
    const seenObjects = new Map()

    mergedPolicy.include = combined.reduce((acc, item) => {
      if (typeof item === 'string') {
        if (!seenStrings.has(item)) {
          seenStrings.add(item)
          acc.push(item)
        }
      } else {
        const entries = seenObjects.get(item.name)
        if (!entries?.has(item.entry)) {
          if (entries) {
            entries.add(item.entry)
          } else {
            seenObjects.set(item.name, new Set([item.entry]))
          }
          acc.push({ ...item })
        }
      }
      return acc
    }, /** @type {NonNullable<LavaMoatPolicy['include']>} */ ([]))
  }
}

/**
 * Merges the {@link LavaMoatPolicy.root} fields of two policies.
 *
 * Mutates {@link mergedPolicy} in place.
 *
 * @param {LavaMoatPolicy} policy Policy
 * @param {LavaMoatPolicy} policyOverride Policy overrides
 * @param {LavaMoatPolicy} mergedPolicy Merged policy
 * @returns {void}
 */
const mergeRoot = (policy, policyOverride, mergedPolicy) => {
  if (policy.root || policyOverride.root) {
    mergedPolicy.root = { ...policy.root, ...policyOverride.root }
  }
}

/**
 * Merges the **DEPRECATED** {@link LavaMoatPolicy.resolutions} fields of two
 * policies.
 *
 * Mutates {@link mergedPolicy} in place.
 *
 * @param {LavaMoatPolicy} policy Policy
 * @param {LavaMoatPolicy} policyOverride Policy overrides
 * @param {LavaMoatPolicy} mergedPolicy Merged policy
 * @returns {void}
 */
const mergeResolutions = (policy, policyOverride, mergedPolicy) => {
  if (policy.resolutions || policyOverride.resolutions) {
    const resA = policy.resolutions ?? {}
    const resB = policyOverride.resolutions ?? {}
    const allResNames = new Set([...keys(resA), ...keys(resB)])
    /** @type {Resolutions} */
    const resolutions = {}
    for (const name of allResNames) {
      resolutions[name] =
        resA[name] && resB[name]
          ? { ...resA[name], ...resB[name] }
          : { ...(resB[name] ?? resA[name]) }
    }
    mergedPolicy.resolutions = resolutions
  }
}

/**
 * Merges the {@link LavaMoatPolicy.use} fields of two policies.
 *
 * Produces a deduplicated union of both arrays.
 *
 * Mutates {@link mergedPolicy} in place.
 *
 * @param {LavaMoatPolicy} policy Policy
 * @param {LavaMoatPolicy} policyOverride Policy overrides
 * @param {LavaMoatPolicy} mergedPolicy Merged policy
 * @returns {void}
 */
const mergeUse = (policy, policyOverride, mergedPolicy) => {
  if (policy.use || policyOverride.use) {
    mergedPolicy.use = [
      ...new Set([...(policy.use ?? []), ...(policyOverride.use ?? [])]),
    ]
  }
}

/**
 * Copies the `debugInfo` field, if present, from {@link policy} to
 * {@link mergedPolicy}.
 *
 * Mutates {@link mergedPolicy} in place.
 *
 * Note that `debugInfo` is only a _shallow copy_ of the `debugInfo` field from
 * {@link policy}, as this object can be of arbitrary size.
 *
 * @param {LavaMoatPolicy | LavaMoatPolicyDebug} policy Policy
 * @param {LavaMoatPolicy} mergedPolicy Merged policy
 * @returns {void}
 */
const retainDebugInfo = (policy, mergedPolicy) => {
  if ('debugInfo' in policy && policy.debugInfo) {
    // @ts-expect-error - debugInfo is only in a LavaMoatPolicyDebug, which is
    // probably deprecated
    mergedPolicy.debugInfo = { ...policy.debugInfo }
  }
}

/**
 * Merges two {@link LavaMoatPolicy} objects with `policyOverrides` taking
 * precedence.
 *
 * If `policyOverrides` is not provided, `policy` is returned.
 *
 * Does _not_ mutate `policy` or `policyOverrides`.
 *
 * @param {LavaMoatPolicy} policy Base policy
 * @param {LavaMoatPolicy} [policyOverrides] Policy overrides
 * @returns {LavaMoatPolicy} Merged policy or `policy` if `policyOverrides` not
 *   provided
 */
const mergePolicy = (policy, policyOverrides) => {
  if (!policyOverrides) {
    return policy
  }

  /** @type {LavaMoatPolicy} */
  const mergedPolicy = { resources: {} }

  mergeResourcePolicies(policy, policyOverrides, mergedPolicy)
  mergeResolutions(policy, policyOverrides, mergedPolicy)
  mergeRoot(policy, policyOverrides, mergedPolicy)
  mergeInclude(policy, policyOverrides, mergedPolicy)
  mergeUse(policy, policyOverrides, mergedPolicy)
  retainDebugInfo(policy, mergedPolicy)

  return mergedPolicy
}

module.exports = { mergePolicy }
