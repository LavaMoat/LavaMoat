/**
 * Definition of a LavaMoat policy schema.
 *
 * Note that we do not need to define the schema of a `LavaMoatPolicyDebug`,
 * since we are never in the business of reading one (only writing).
 *
 * @packageDocumentation
 */
import type { LavaMoatPolicy } from '@lavamoat/types'
import { isBuiltin } from 'node:module'
import { z } from 'zod/v4'

const { entries } = Object

/**
 * Matches a canonical name
 */
const CANONICAL_NAME_REGEX =
  /^(?:(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*)(?:>(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*)*$/

/**
 * Schema for a canonical name
 */
const canonicalNameSchema = z
  .union([z.string().regex(CANONICAL_NAME_REGEX), z.literal('$root$')])
  .meta({
    id: 'canonicalName',
    description:
      'Canonical name of a package representing the shortest path via the dependency tree (or `$root$` for a trusted root package)',
  })

/**
 * Schema for a global policy value
 */
const globalPolicyValueSchema = z
  .union([
    z
      .boolean()
      .meta({ description: '`true` for read capability; `false` for none' }),
    z.literal('write').meta({ description: 'write capability' }),
    z.literal('redefine').meta({ description: 'redefine capability' }),
  ])
  .meta({
    id: 'globalPolicyValue',
    description: 'Global policy value',
  })

/**
 * Schema for a global property key
 *
 * @remarks
 * Global property string keys containing a dot (e.g., `globalThis['foo.bar']`)
 * cannot be represented; this would be understood to LavaMoat as the `bar`
 * property of the `foo` global.
 */
const globalPropertyKeySchema = z.string().meta({
  description: 'Global property key or property thereof; dot notation allowed',
  id: 'globalProperty',
})

/**
 * Schema for a global policy
 *
 * @remarks
 * This is the `GlobalPolicy` type.
 */
const globalPolicySchema = z
  .record(globalPropertyKeySchema, globalPolicyValueSchema)
  .check(({ issues, value }) => {
    for (const [propertyKey, policyValue] of entries(value)) {
      if (propertyKey.includes('.') && policyValue === 'write') {
        issues.push({
          code: 'custom',
          message: `Writable properties of globals are currently unsupported`,
          input: value,
          path: [propertyKey],
          inst: globalPolicySchema,
        })
      }
    }
  })
  .meta({
    description:
      'Globals (including properties using dot notation) accessible to the resource; `true` to allow and `false` to deny',
    id: 'globalPolicy',
  })

/**
 * Schema for a builtin module name
 *
 * Note: the list of builtin modules is dependent on the Node.js version, so we
 * cannot easily specify a static enumeration of possible module names.
 */
const builtinNameSchema = z
  .string()
  .refine((value) => {
    const moduleName = `${value.split('.')?.shift()}`
    return isBuiltin(moduleName)
  })
  .meta({
    description:
      'Name of a builtin module or property thereof; dot notation allowed',
    id: 'builtinName',
  })

/**
 * Schema for a builtin policy
 *
 * @remarks
 * This is the `BuiltinPolicy` type.
 */
const builtinPolicySchema = z
  .record(
    builtinNameSchema,
    z.boolean().meta({
      description: '`true` to allow access and `false` to deny access',
      id: 'builtinPolicy',
    })
  )
  .meta({
    description: 'Mapping of builtin module name to builtin policy value',
  })

/**
 * Schema for a package policy
 *
 * @remarks
 * This is the `PackagePolicy` type.
 */
const packagePolicySchema = z
  .record(
    canonicalNameSchema,
    z.boolean().meta({
      id: 'packagePolicy',
      description:
        'Additional external packages (in their entirety) accessible to the module; `true` to allow and `false` to deny',
    }),
    {
      error: (err) => {
        if (err.code === 'invalid_key') {
          return `Invalid canonical name; must be one or more package names delimited by ">"`
        }
      },
    }
  )
  .meta({
    description: 'Mapping of canonical package name to package policy value',
  })

/**
 * Schema for a native policy
 */
const nativePolicySchema = z.boolean().meta({
  id: 'nativePolicy',
  description: '`true` to allow loading of native modules; `false` for none',
})

/**
 * Schema for a resource policy
 *
 * @remarks
 * This is the `ResourcePolicy` type.
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
 *
 * @remarks
 * This is the `RootPolicy` type.
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
 *
 * @remarks
 * This is the `Resources` type.
 */
const resourcesSchema = z
  .record(canonicalNameSchema, resourcePolicySchema, {
    error: (err) => {
      if (err.code === 'invalid_key') {
        return `Invalid canonical name; must be one or more package names delimited by ">"`
      }
    },
  })
  .meta({
    description: 'Mapping of canonical package name to resource policy value',
    id: 'resources',
  })

/**
 * Schema for a LavaMoat policy
 *
 * @remarks
 * The explicit type here is so that an object passing thru Zod will be typed as
 * a `LavaMoatPolicy` instead of whatever Zod infers from the schema.
 */
export const lavaMoatPolicySchema: z.ZodType<LavaMoatPolicy> = z
  .object({
    resources: resourcesSchema,
    root: rootPolicySchema.optional(),
  })
  .refine(
    (value) =>
      value.root?.usePolicy !== undefined
        ? !!value.resources[value.root.usePolicy]
        : true,
    {
      error: 'If provided, root policy must reference a known resource',
      path: ['root', 'usePolicy'],
    }
  )
  .meta({
    description: 'LavaMoat policy',
  })
