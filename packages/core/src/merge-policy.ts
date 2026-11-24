/**
 * Provides {@link mergePolicy} for merging LavaMoat policies.
 *
 * @packageDocumentation
 */

import { utils } from 'lavamoat-tofu'
import jsonStringify from 'json-stable-stringify'
import type {
  BuiltinPolicy,
  GlobalPolicy,
  IncludePolicy,
  LavaMoatPolicy,
  ResourcePolicy,
  Resources,
} from '@lavamoat/types'

const { reduceToTopmostApiCalls, validateHierarchy, objToMap, mapToObj } = utils
const { entries, keys } = Object
const { isArray } = Array

/**
 * Options for {@link dedupePolicyPaths}.
 *
 * @template PolicyItems Type of policy items
 * @internal
 */
interface DedupePolicyPathsOptions<
  PolicyItems extends BuiltinPolicy | GlobalPolicy,
> {
  policyItems: PolicyItems
  overrideItems?: PolicyItems
  resourceId: string
}

/**
 * Dedupes policy paths by removing nested paths and adding back in paths
 * explicitly allowed in overrides.
 *
 * @internal
 */
function dedupePolicyPaths<PolicyItems extends BuiltinPolicy | GlobalPolicy>({
  policyItems,
  overrideItems,
  resourceId,
}: DedupePolicyPathsOptions<PolicyItems>): PolicyItems {
  const itemMap = objToMap(policyItems) as Map<
    string,
    PolicyItems[keyof PolicyItems]
  >

  reduceToTopmostApiCalls(
    itemMap
  )

  // After removing all nesting, add back in sub-fields explicitly allowed in overrides
  if (overrideItems) {
    entries(overrideItems).forEach(([path, value]) => {
      if (value !== false && !itemMap.has(path)) {
        itemMap.set(path, value as PolicyItems[keyof PolicyItems])
      }
    })
  }

  const violations = validateHierarchy(
    itemMap
  )
  if (violations.length > 0) {
    const violationMessages = violations.map(({ path, parent }) => {
      return `"${path}" is invalid when "${parent}" is also present in policy"`
    })
    throw new Error(
      `LavaMoat - Policy hierarchy validation failed for resource "${resourceId}"\n  ${violationMessages.join('\n  ')}\nYou could set the parent "${violations[0].parent}" to false if you intended to override to a less permissive policy.`
    )
  }

  return mapToObj(itemMap) as unknown as PolicyItems
}

/**
 * Merges two {@link ResourcePolicy} objects.
 *
 * Dict-valued fields (`globals`, `builtin`, `packages`, `meta`) are
 * shallow-merged with `resourcesB` taking precedence. Scalar fields (`native`)
 * use `resourcesB`'s value when present.
 *
 * @internal
 */
function mergeResourcePolicy(
  policyResources: ResourcePolicy,
  policyOverrideResources: ResourcePolicy
): ResourcePolicy {
  const result: ResourcePolicy = {}

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

  return result
}

/**
 * Merges the {@link LavaMoatPolicy.resources} fields of two policies.
 *
 * Mutates `mergedPolicy` in place.
 *
 * @internal
 */
function mergeResourcePolicies(
  policy: LavaMoatPolicy,
  policyOverride: LavaMoatPolicy,
  mergedPolicy: LavaMoatPolicy
): void {
  const { resources: resourcesA = {} } = policy
  const { resources: resourcesB = {} } = policyOverride
  const allResourceNames = new Set([...keys(resourcesA), ...keys(resourcesB)])

  const resources: Resources = {}
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
 * Deep-clones an include item so the merged result shares no object references
 * with the inputs.
 *
 * @internal
 */
function cloneIncludePolicy(item: IncludePolicy): IncludePolicy {
  if (typeof item === 'string') return item
  if ('modules' in item && item.modules) {
    return { ...item, modules: [...item.modules] }
  }
  return { ...item }
}

/**
 * Merges the {@link LavaMoatPolicy.include} fields of two policies.
 *
 * Mutates `mergedPolicy` in place.
 *
 * @internal
 */
function mergeInclude(
  policy: LavaMoatPolicy,
  policyOverride: LavaMoatPolicy,
  mergedPolicy: LavaMoatPolicy
): void {
  if (policy.include ?? policyOverride.include) {
    const combined: NonNullable<LavaMoatPolicy['include']> = [
      ...(policy.include ?? []),
      ...(policyOverride.include ?? []),
    ]

    const seen = new Set<string>()

    const replacer = (key: jsonStringify.Key, value: unknown) =>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      key === 'modules' && isArray(value) ? [...value].sort() : value

    mergedPolicy.include = combined.reduce(
      (acc, item) => {
        const keyStr = `${jsonStringify(item, { replacer })}`
        if (!seen.has(keyStr)) {
          seen.add(keyStr)
          acc.push(cloneIncludePolicy(item))
        }
        return acc
      },
      [] as NonNullable<LavaMoatPolicy['include']>
    )
  }
}

/**
 * Merges the {@link LavaMoatPolicy.root} fields of two policies.
 *
 * Mutates `mergedPolicy` in place.
 *
 * @internal
 */
function mergeRoot(
  policy: LavaMoatPolicy,
  policyOverride: LavaMoatPolicy,
  mergedPolicy: LavaMoatPolicy
): void {
  if (policy.root ?? policyOverride.root) {
    mergedPolicy.root = { ...policy.root, ...policyOverride.root }
  }
}

/**
 * Merges two {@link LavaMoatPolicy} objects with `policyOverrides` taking
 * precedence.
 *
 * If `policyOverrides` is not provided, `policy` is returned unchanged.
 *
 * Does _not_ mutate `policy` or `policyOverrides`.
 *
 * @remarks
 * The deprecated `resolutions` and `debugInfo` fields from `lavamoat-core` are
 * intentionally not supported.
 *
 * @param policy - Base policy
 * @param policyOverrides - Policy overrides (optional)
 * @returns Merged policy, or `policy` unchanged if `policyOverrides` not given
 *
 * @example
 * ```ts
 * const merged = mergePolicy(generatedPolicy, policyOverride)
 * ```
 */
export function mergePolicy(
  policy: LavaMoatPolicy,
  policyOverrides?: LavaMoatPolicy
): LavaMoatPolicy {
  if (!policyOverrides) {
    return policy
  }

  const mergedPolicy: LavaMoatPolicy = { resources: {} }

  mergeResourcePolicies(policy, policyOverrides, mergedPolicy)
  mergeRoot(policy, policyOverrides, mergedPolicy)
  mergeInclude(policy, policyOverrides, mergedPolicy)

  return mergedPolicy
}
