/**
 * Definition of a LavaMoat policy schema.
 *
 * Note that we do not need to define the schema of a `LavaMoatPolicyDebug`,
 * since we are never in the business of reading one (only writing).
 *
 * @packageDocumentation
 */

import { isBuiltin } from 'node:module'
import { posix } from 'node:path'
import * as z from 'zod'

const { entries } = Object

/**
 * Root resource name
 */
export const ROOT = '$root$'

/**
 * Policy value for a global with "write" capability
 */
export const WRITE = 'write'

/**
 * Policy value for a global with "redefine" capability
 */
export const REDEFINE = 'redefine'

/**
 * Policy value for a global with "read" capability
 *
 * @deprecated Use a boolean instead
 */
export const READ = 'read'

/**
 * Schema for the root resource name
 */
export const rootResourceNameSchema = z.literal(ROOT).meta({
  id: 'rootName',
  description: `Resource name of the entry package (${ROOT})`,
})

/**
 * Matches a canonical name
 */
export const CANONICAL_NAME_REGEX =
  /^(?:(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*)(?:>(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*)*$/i

export const canonicalNameRegexSchema = z
  .string()
  .regex(CANONICAL_NAME_REGEX)
  .min(1)
  .meta({
    id: 'canonicalNameRegex',
    description: `Regex for a canonical name`,
  })

/**
 * Schema for a canonical name
 */
export const canonicalNameSchema = z
  .union([canonicalNameRegexSchema, rootResourceNameSchema])
  .meta({
    id: 'canonicalName',
    description: `Canonical name of a package representing the shortest path via the dependency tree (or ${ROOT} for a trusted root package)`,
  })

/**
 * Schema for a global policy write capability
 */
export const globalPolicyWriteSchema = z.literal(WRITE).meta({
  id: 'globalPolicyWrite',
  description: `Policy value for a global with "${WRITE}" capability`,
})

/**
 * Schema for a global policy redefine capability
 */
export const globalPolicyRedefineSchema = z.literal(REDEFINE).meta({
  id: 'globalPolicyRedefine',
  description: `Policy value for a global with "${REDEFINE}" capability`,
})

/**
 * Schema for a global policy read capability (boolean)
 */
export const globalPolicyBooleanSchema = z.boolean().meta({
  description: '`true` for "read" capability; `false` for none',
  id: 'globalPolicyBoolean',
})

/**
 * Schema for a global policy read capability
 *
 * @deprecated Use {@link globalPolicyBooleanSchema} instead
 */
export const globalPolicyReadSchema = z.literal(READ).meta({
  description: `DEPRECATED; use a boolean instead`,
  id: 'globalPolicyRead',
})

/**
 * Schema for a global policy value
 */
export const globalPolicyValueSchema = z
  .union([
    globalPolicyBooleanSchema,
    globalPolicyWriteSchema,
    globalPolicyRedefineSchema,
    globalPolicyReadSchema,
  ])
  .meta({
    id: 'globalPolicyValue',
    description: 'Global policy value',
  })

export const resourceMetadataKeySchema = z.string().meta({
  description: 'Key for a resource metadata entry',
  id: 'resourceMetadataKey',
})

export const resourceMetadataValueSchema = z
  .string()
  .or(z.array(z.string()))
  .meta({
    description: 'Value for a resource metadata entry',
    id: 'resourceMetadataValue',
  })

export const resourceMetadataSchema = z
  .record(resourceMetadataKeySchema, resourceMetadataValueSchema)
  .meta({
    description: 'Metadata about the resource (EXPERIMENTAL)',
    id: 'resourceMetadata',
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
export const globalPolicySchema = z
  .record(globalPropertyKeySchema, globalPolicyValueSchema)
  .check(({ issues, value }) => {
    for (const [propertyKey, policyValue] of entries(value)) {
      if (propertyKey.includes('.')) {
        if (policyValue === WRITE) {
          issues.push({
            code: 'custom',
            message: `Writable properties of globals are currently unsupported`,
            input: value,
            path: [propertyKey],
            inst: globalPolicySchema,
          })
        } else if (policyValue === REDEFINE) {
          issues.push({
            code: 'custom',
            message: `Redefinable properties of globals are currently unsupported`,
            input: value,
            path: [propertyKey],
            inst: globalPolicySchema,
          })
        }
      }
    }
  })
  .meta({
    description:
      'Globals (including properties using "dot" notation) accessible to the resource; `true` to allow and `false` to deny',
    id: 'globalPolicy',
  })

/**
 * Schema for a builtin module name
 *
 * Note: the list of builtin modules is dependent on the Node.js version, so we
 * cannot easily specify a static enumeration of possible module names.
 */
export const builtinNameSchema = z
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
export const builtinPolicySchema = z
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
export const packagePolicySchema = z
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
          return `Invalid canonical name; must be one or more package names delimited by ">" or ${ROOT}`
        }
      },
    }
  )
  .meta({
    description: `Mapping of canonical package name (or ${ROOT}) to package policy value`,
  })

/**
 * Schema for a native policy
 */
export const nativePolicySchema = z.boolean().meta({
  id: 'nativePolicy',
  description: '`true` to allow loading of native modules; `false` for none',
})

/**
 * Schema for a resource policy
 *
 * @remarks
 * This is the `ResourcePolicy` type.
 */
export const resourcePolicySchema = z
  .object({
    globals: globalPolicySchema.optional(),
    builtin: builtinPolicySchema.optional(),
    packages: packagePolicySchema.optional(),
    native: nativePolicySchema.optional(),
    meta: resourceMetadataSchema.optional(),
  })
  .meta({
    description: 'Policy for a given resource',
    id: 'resourcePolicy',
  })

export const usePolicySchema = canonicalNameSchema.meta({
  description: 'Reference to resource policy to use for the application root',
  id: 'usePolicy',
})

/**
 * Schema for a root policy
 *
 * @remarks
 * This is the `RootPolicy` type.
 */
export const rootPolicySchema = z
  .object({
    usePolicy: usePolicySchema.optional(),
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
export const resourcesSchema = z
  .record(canonicalNameSchema, resourcePolicySchema, {
    error: (err) => {
      if (err.code === 'invalid_key') {
        return `Invalid canonical name; must be one or more package names delimited by ">" (or "${ROOT}")`
      }
    },
  })
  .meta({
    description: `Mapping of canonical package name (or "${ROOT}") to resource policy value`,
    id: 'resources',
  })

/**
 * Schema for module path(s) to forcefully include in the policy
 */
export const includeEntryModulesSchema = z
  .array(z.string().min(1))
  .optional()
  .meta({
    description:
      'Module paths relative to the policy override file to forcefully include in generated policy; if omitted, the `.` path is implied',
    id: 'includeEntryModules',
  })

/**
 * Schema for a named resource to forcefully include in the policy.
 */
export const includeEntryNameSchema = canonicalNameSchema.meta({
  description: 'Canonical name of package (must be present in dependency tree)',
  id: 'includeEntryName',
})

/**
 * Schema for a named resource to forcefully include in the policy
 *
 * @remarks
 * This is the `IncludeEntryByName` type.
 */
export const includeEntryByNameSchema = z
  .object({
    name: includeEntryNameSchema,
    modules: includeEntryModulesSchema,
  })
  .meta({
    description:
      'List of canonical names and optionally relative module paths to forcefully include in the policy',
    id: 'includeEntryByName',
  })

/**
 * Schema for a location to forcefully include in the policy
 *
 * @remarks
 * This is the `IncludeEntryByLocation` type.
 */
export const includeEntryByLocationSchema = z
  .object({
    location: z
      .string()
      .min(1)
      .refine((value) => !posix.isAbsolute(value), {
        error: ({ input }) => `"${input}" must be a relative path`,
      })
      .meta({
        description:
          'Relative path to directory containing a `package.json`, relative to the policy override file; cannot ascend above project root',
        id: 'includeEntryByLocationLocation',
      }),
    modules: includeEntryModulesSchema,
  })
  .meta({
    description:
      'List of locations and optionally relative module paths to forcefully include in the policy',
    id: 'includeEntryByLocation',
  })

/**
 * Schema for {@link LavaMoatPolicy.include}
 */
export const includePolicySchema = z
  .union([
    includeEntryNameSchema,
    includeEntryByNameSchema,
    includeEntryByLocationSchema,
  ])
  .meta({
    description: `List of canonical names (or ${ROOT}) and/or entry paths to forcefully include in the policy`,
    id: 'include',
  })

/**
 * Schema for a LavaMoat policy
 */
export const lavaMoatPolicySchema = z
  .object({
    resources: resourcesSchema,
    root: rootPolicySchema.optional(),
    include: z.array(includePolicySchema).optional(),
  })
  .meta({
    description: 'LavaMoat Policy',
  })
