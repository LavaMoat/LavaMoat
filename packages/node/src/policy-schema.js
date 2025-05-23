/**
 * Definition of a LavaMoat policy schema
 *
 * @packageDocumentation
 */

import { z } from 'zod/v4'

/**
 * @import {LavaMoatPolicy} from 'lavamoat-core'
 */

/**
 * Matches a canonical name
 */
const CANONICAL_NAME_REGEX =
  /^(?:@(?:[^/]+?)[/])?(?:[^/]+?)(?:>(?:@(?:[^/]+?)[/])?(?:[^/]+?))*$/

/**
 * Schema for a canonical name
 */
const canonicalNameSchema = z
  .string()
  .refine((value) => CANONICAL_NAME_REGEX.test(value), {
    error: 'Key must match format <package-name>[><package-name>..]',
  })
  .meta({
    id: 'canonicalName',
    description:
      'Canonical name of a package representing the shortest path via the dependency tree',
  })

/**
 * Schema for a global policy value
 */
const globalPolicyValueSchema = z
  .union([
    z
      .boolean()
      .meta({ description: 'true for read capability; false for none' }),
    z.literal('write').meta({ description: 'write capability' }),
    z.literal('redefine').meta({ description: 'redefine capability' }),
  ])
  .meta({
    id: 'globalPolicyValue',
    description: 'Global policy value',
  })

/**
 * Schema for a global policy
 */
const globalPolicySchema = z.record(z.string(), globalPolicyValueSchema).meta({
  description:
    'Globals (including properties using dot notation) accessible to the resource; `true` to allow and `false` to deny',
  id: 'globalPolicy',
})

/**
 * Schema for a builtin policy
 */
const builtinPolicySchema = z
  .record(
    z.string(),
    z.boolean().meta({
      description:
        'Node.js builtins (including properties using dot notation); `true` to allow and `false` to deny',
      id: 'builtinPolicy',
    })
  )
  .meta({
    description: 'Mapping of builtin module to builtin policy value',
  })

/**
 * Schema for a package policy
 */
const packagePolicySchema = z
  .record(
    canonicalNameSchema,
    z.boolean().meta({
      id: 'packagePolicy',
      description:
        'Additional external packages (in their entirety) accessible to the module; `true` to allow and `false` to deny',
    })
  )
  .meta({
    description: 'Mapping of canonical package name to package policy value',
  })

/**
 * Schema for a native policy
 */
const nativePolicySchema = z.boolean().meta({
  id: 'nativePolicy',
  description: 'true for native capability; false for none',
})

/**
 * Schema for a resource policy
 */
const resourcePolicySchema = z
  .object({
    globals: globalPolicySchema.optional(),
    builtin: builtinPolicySchema.optional(),
    packages: packagePolicySchema.optional(),
    native: nativePolicySchema.optional(),
  })
  .meta({
    description: 'Policy for a given resource',
    id: 'resourcePolicy',
  })

/**
 * Schema for a root policy
 */
const rootPolicySchema = z
  .object({
    usePolicy: canonicalNameSchema.optional().meta({
      description:
        'Reference to resource policy to use for the application root',
    }),
  })
  .meta({
    description: 'Root policy configuration',
    id: 'root',
  })

/**
 * Schema for a resources mapping
 */
const resourcesSchema = z
  .record(canonicalNameSchema, resourcePolicySchema)
  .meta({
    description: 'Mapping of canonical package name to resource policy value',
    id: 'resources',
  })

/**
 * Schema for a LavaMoat policy
 */
export const lavaMoatPolicySchema = /** @type {z.ZodType<LavaMoatPolicy>} */ (
  z
    .object({
      resources: resourcesSchema,
      root: rootPolicySchema.optional(),
    })
    .refine(
      (value) =>
        value.root?.usePolicy !== undefined
          ? !!value.resources[value.root.usePolicy]
          : false,
      {
        error: 'If provided, root policy must reference a known resource',
        path: ['root.usePolicy'],
      }
    )
    .meta({
      description: 'LavaMoat policy',
    })
)

/**
 * Asserts that `allegedPolicy` is a valid LavaMoat policy
 *
 * @param {unknown} allegedPolicy
 * @returns {asserts policy is LavaMoatPolicy}
 */
export const assertLavaMoatPolicy = (allegedPolicy) => {
  lavaMoatPolicySchema.parse(allegedPolicy)
}

export const createLavaMoatPolicyJSONSchema = () => {
  return z.toJSONSchema(lavaMoatPolicySchema)
}
