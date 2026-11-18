/**
 * LavaMoat policy types generated from schemas.
 *
 * @packageDocumentation
 */

import type * as z from 'zod'
import type {
  builtinPolicySchema,
  globalPolicyBooleanSchema,
  globalPolicyRedefineSchema,
  globalPolicySchema,
  globalPolicyValueSchema,
  globalPolicyWriteSchema,
  includeEntryByLocationSchema,
  includeEntryByNameSchema,
  includePolicySchema,
  lavaMoatPolicySchema,
  packagePolicySchema,
  resourceMetadataSchema,
  resourcePolicySchema,
  resourcesSchema,
  rootPolicySchema,
} from './policy-schema.js'

/**
 * A writable global property
 */
export type GlobalPolicyWrite = z.infer<typeof globalPolicyWriteSchema>

/**
 * A property which can be defined via {@link Object.defineProperty} and/or
 * {@link Object.defineProperties}
 */
export type GlobalPolicyRedefine = z.infer<typeof globalPolicyRedefineSchema>

export type GlobalPolicyRead = z.infer<typeof globalPolicyBooleanSchema>

/**
 * Possible values for global policy
 */
export type GlobalPolicyValue = z.infer<typeof globalPolicyValueSchema>

/**
 * Node.js builtins (including properties using dot notation); `true` to allow
 * and `false` to deny
 */
export type BuiltinPolicy = z.infer<typeof builtinPolicySchema>

/**
 * Additional external packages (in their entirety) accessible to the module;
 * `true` to allow and `false` to deny
 */
export type PackagePolicy = z.infer<typeof packagePolicySchema>

/**
 * Globals (including properties using dot notation) accessible to the module;
 * `true` to allow and `false` to deny
 */
export type GlobalPolicy = z.infer<typeof globalPolicySchema>

export type ResourcePolicy = z.infer<typeof resourcePolicySchema>

export type ResourceMetadata = z.infer<typeof resourceMetadataSchema>

/**
 * Describe the resources available to your application and direct dependencies
 */
export type Resources = z.infer<typeof resourcesSchema>

/**
 * Root configuration
 */
export type RootPolicy = z.infer<typeof rootPolicySchema>

/**
 * Schema for LavaMoat policy files
 */
export type LavaMoatPolicy = z.infer<typeof lavaMoatPolicySchema>

/**
 * The type of {@link LavaMoatPolicy.include}.
 *
 * If a `string`, it is treated as an {@link IncludeEntryByName} with a single
 * module path of `.` (which resolves to the package's declared entrypoint).
 */
export type IncludePolicy = z.infer<typeof includePolicySchema>

/**
 * List of canonical names and optionally relative module paths to forcefully
 * include in the policy.
 *
 * Canonical names do not need to be present in {@link Resources}.
 */
export type IncludeEntryByName = z.infer<typeof includeEntryByNameSchema>

/**
 * List of locations and optionally relative module paths to forcefully include
 * in the policy.
 */
export type IncludeEntryByLocation = z.infer<
  typeof includeEntryByLocationSchema
>
