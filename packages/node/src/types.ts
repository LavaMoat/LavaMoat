/**
 * Public types for `@lavamoat/node`
 *
 * Any type name prefixed with `With` is a type used to compose options buckets
 * for public APIs. `With`-prefixed types are _expected to be interfaces_ unless
 * they cannot be due to having dynamic properties.
 *
 * @packageDocumentation
 */
import type {
  CryptoInterface,
  Policy as EndoPolicy,
  FsInterface,
  ImportLocationOptions,
  PackageCompartmentDescriptor,
  PackagePolicy,
  PathInterface,
  ReadNowPowers,
  SyncImportLocationOptions,
  UrlInterface,
} from '@endo/compartment-mapper'
import type { LavaMoatPolicy } from '@lavamoat/types'
import type { IsBuiltinFn, LavaMoatScuttleOpts } from 'lavamoat-core'
import type { Loggerr } from 'loggerr'
import type nodeFs from 'node:fs'
import type { PathLike, Stats } from 'node:fs'
import type { Except, Simplify, Writable } from 'type-fest'
import type {
  ENDO_GLOBAL_POLICY_ITEM_WRITE,
  ENDO_POLICY_ITEM_ROOT,
  SOURCE_TYPE_MODULE,
  SOURCE_TYPE_SCRIPT,
} from './constants.js'
export type { FileUrlString } from '@endo/compartment-mapper'

/**
 * A loaded application which has not yet been executed
 */
export interface ApplicationLoader<T = unknown> {
  /**
   * Imports the application (executing it)
   *
   * @returns Whatever it exports under `namespace` prop
   */
  import: () => Promise<{ namespace: T }>

  /**
   * The hash of the compartment map
   *
   * Present only if {@link ReadNowPowers.computeSha512} was provided
   */
  sha512?: string
}

/**
 * Custom data potentially assigned to the `options` prop of an
 * {@link PackagePolicy.options Endo package policy}
 */
export interface LavaMoatEndoPackagePolicyOptions {
  /**
   * If this is `true`, then the package is allowed to run native modules
   */
  native?: boolean
}

export interface WithProdOnly {
  prodOnly?: boolean
}

/**
 * Options having an {@link IsBuiltinFn}
 */
export interface WithIsBuiltin {
  /**
   * A function which returns `true` if the given specfifier references a
   * builtin module.
   *
   * Used during policy generation.
   */
  isBuiltin?: IsBuiltinFn
}

export interface WithLog {
  /**
   * `Loggerr` instance for logging
   */
  log?: Loggerr
}

export interface WithPolicyOnly {
  /**
   * A {@link LavaMoatPolicy} object.
   */
  policy?: LavaMoatPolicy
  /**
   * Disallowed in lieu of {@link policy}
   */
  policyPath?: never
}

/**
 * Raw powers which can be converted to a {@link ReadNowPowers} object.
 *
 * For this to work, {@link WithRawPowers.fs} _must_ be defined. It cannot
 * contain a `readPowers` property.
 */
export interface WithRawPowers {
  crypto?: CryptoInterface
  fs: FsInterface
  path?: PathInterface
  readPowers?: never
  url?: UrlInterface
}

/**
 * Options having a `readPowers` property.
 */
export interface WithReadPowers {
  crypto?: never
  fs?: never
  path?: never

  /**
   * Read powers to use when loading the compartment map.
   */
  readPowers?: ReadNowPowers
  url?: never
}

/**
 * Options having a `trustRoot` property
 */
export interface WithTrustRoot {
  trustRoot?: boolean
}

/**
 * Options having a `scuttleGlobalThis` property
 */
export interface WithScuttleGlobalThis {
  scuttleGlobalThis?: LavaMoatScuttleOpts
}

/**
 * Superset of {@link FsInterface} necessary to write a policy to disk
 */
export interface WritableFsInterface {
  promises: WritePowers
}

/**
 * Powers necessary to write a policy to disk
 */
export interface WritePowers {
  mkdir: (
    path: string,
    { recursive }: { recursive: true }
  ) => Promise<string | undefined>
  writeFile: (path: string, data: string) => Promise<void>

  rm: (path: string, { recursive }: { recursive: true }) => Promise<void>
}

export type WithLoadForMapOptions = ComposeOptions<
  [
    Except<ImportLocationOptions, 'importHook' | 'log' | '_preload'>,
    WithLog,
    WithProdOnly,
  ]
>

/**
 * "Writable" identifier for a LavaMoat global policy item in the context of an
 * Endo policy
 */
export type EndoWritePolicy = typeof ENDO_GLOBAL_POLICY_ITEM_WRITE

/**
 * A module source type
 */
export type SourceType = typeof SOURCE_TYPE_MODULE | typeof SOURCE_TYPE_SCRIPT

export interface WithLavaMoatEndoPolicy {
  endoPolicy?: LavaMoatEndoPolicy
}

/**
 * Options bucket containing a `compact` prop
 */
export interface WithCompact {
  /**
   * When `true`, compute a compacted policy override and include it in the
   * result as `compactedPolicyOverride`. Has no effect when no policy override
   * was loaded from disk.
   */
  compact?: boolean
}

/**
 * Options for `generatePolicy()`
 *
 * @remarks
 * If testing with a virtual filesystem, `projectRoot` _must_ be provided, since
 * it defaults to `process.cwd()`, which references not-your-filesystem.
 */
export type GeneratePolicyOptions = ComposeOptions<
  [
    WithReadPowersAndTrust,
    WithIsBuiltin,
    WithLoadForMapOptions,
    WithScuttleGlobalThis,
    WithProjectRoot,
    WithReadFile,
    WithPolicies,
    WithCompact,
  ]
>

/**
 * Result of `generatePolicy()`
 */
export type GeneratePolicyResult = {
  policy: Merged<LavaMoatPolicy>
  hasWarnings: boolean
  /**
   * Present only when `compact: true` was passed and a policy override was
   * loaded from disk. Contains the override with redundant entries removed.
   */
  compactedPolicyOverride?: LavaMoatPolicy
  /**
   * The absolute path to the policy override file that was loaded from disk.
   * Only set when a policy override was actually read from disk (not when
   * `policyOverride` was passed as an object).
   */
  policyOverridePath?: string
}

/**
 * Params to LavaMoat's global attenuator
 */
export type GlobalAttenuatorParams = [LavaMoatEndoGlobalPolicyItem]

/**
 * Extends Endo's `PolicyItem` with the special {@link LavaMoatEndoRootPolicy}
 * and {@link LavaMoatEndoWritablePropertyPolicy}
 */
export type LavaMoatEndoGlobalPolicyItem =
  | LavaMoatEndoRootPolicy
  | LavaMoatEndoWritablePropertyPolicy

/**
 * Package policy based on {@link LavaMoatEndoPackagePolicyItem} and
 * {@link LavaMoatEndoGlobalPolicyItem}.
 *
 * Member of {@link LavaMoatEndoPolicy}
 */
export type LavaMoatEndoPackagePolicy = PackagePolicy<
  LavaMoatEndoPackagePolicyItem,
  LavaMoatEndoGlobalPolicyItem,
  void,
  LavaMoatEndoPackagePolicyOptions
>

/**
 * Extends Endo's `PolicyItem` with the special {@link LavaMoatEndoRootPolicy}
 */
export type LavaMoatEndoPackagePolicyItem = LavaMoatEndoRootPolicy

/**
 * `@lavamoat/node`'s customized Endo policy, with support for our global
 * attenuator.
 */
export type LavaMoatEndoPolicy = EndoPolicy<
  LavaMoatEndoPackagePolicyItem,
  LavaMoatEndoGlobalPolicyItem,
  void,
  LavaMoatEndoPackagePolicyOptions
>

/**
 * "Root" identifier for a LavaMoat global policy item in the context of an Endo
 * policy
 */
export type LavaMoatEndoRootPolicy = typeof ENDO_POLICY_ITEM_ROOT

/**
 * Like Endo's `PropertyPolicy`, but can be a {@link EndoWritePolicy} instead of
 * just `boolean`.
 */
export type LavaMoatEndoWritablePropertyPolicy = Record<
  string,
  EndoWritePolicy | boolean
>

/**
 * Options for _our_ `makeReadPowers()` function
 */
export type MakeReadPowersOptions = WithRawReadPowers

/**
 * Options for `run()`
 */

export type RunOptions = ComposeOptions<
  [
    WithRawReadPowers,
    WithProdOnly,
    WithTrustRoot,
    WithScuttleGlobalThis,
    WithLog,
    WithProjectRoot,
    WithReadFile,
    WithPolicies,
  ]
>

/**
 * Options containing a `cwd` property
 */
export interface WithProjectRoot {
  /**
   * Project root directory
   *
   * @defaultValue `process.cwd()`
   */
  projectRoot?: string | URL
}

/**
 * Options which may either {@link WithReadPowers} or {@link WithRawPowers} but
 * not both.
 */
export type WithRawReadPowers = WithReadPowers | WithRawPowers

/**
 * Options having both {@link WithReadPowers} and {@link WithTrustRoot}
 * properties.
 *
 * These properties always appear together in compartment map operations.
 */
export type WithReadPowersAndTrust = ComposeOptions<
  [WithReadPowers, WithTrustRoot]
>

/**
 * Options having {@link WithReadPowersAndTrust} and
 * {@link WithLavaMoatEndoPolicy} properties.
 *
 * These properties always appear together in compartment map execution.
 */
export type WithReadPowersAndTrustAndEndoPolicy = ComposeOptions<
  [WithReadPowersAndTrust, WithLavaMoatEndoPolicy]
>

export type CanonicalName = PackageCompartmentDescriptor['label']

// re-export schema
// TODO: make this less bad
export type {
  BuiltinPolicy,
  GlobalPolicy,
  GlobalPolicyRead,
  GlobalPolicyValue,
  GlobalPolicyWrite,
  LavaMoatPolicy,
  PackagePolicy,
  Resolutions,
  ResourcePolicy,
  Resources as ResourcePolicyRecord,
  Resources,
  RootPolicy,
} from '@lavamoat/types'
export type * from './errors.js'

/**
 * Options bucket containing a `readFile` prop
 */
export interface WithReadFile {
  readFile?: ReadFileFn
}

/**
 * This is ever-so-slightly different than `ReadFn`.
 */
export type ReadFileFn = (path: PathLike) => Promise<string | Buffer>

/**
 * Extra bits of the `fs` module that we need for internal utilities.
 */
export interface FsUtilInterface {
  lstatSync: (
    path: PathLike,
    options?: {
      throwIfNoEntry?: boolean
    }
  ) => Pick<Stats, 'isFile' | 'isSymbolicLink'>
  statSync: (
    path: PathLike,
    options?: {
      throwIfNoEntry?: boolean
    }
  ) => Pick<Stats, 'isFile' | 'isSymbolicLink'>
  accessSync: (path: PathLike, mode?: number) => void
  constants: Pick<typeof nodeFs.constants, 'R_OK' | 'X_OK'>
  promises: {
    readFile: ReadFileFn
  }
  realpathSync: (path: PathLike, encoding?: BufferEncoding) => Buffer | string
}

/**
 * Options bucket containing an `fs` prop (for internal utilities; not for use
 * with {@link WithRawPowers})
 */
export interface WithFs {
  fs?: FsUtilInterface
}

/**
 * `true` if all overlapping keys between `A` and `B` have identical types;
 * vacuously `true` when there is no overlap.
 */
type OverlapCompatible<A extends object, B extends object> = [
  keyof A & keyof B,
] extends [never]
  ? true
  : {
        [K in keyof A & keyof B]: [A[K], B[K]] extends [B[K], A[K]] ? 1 : 0
      }[keyof A & keyof B] extends 1
    ? true
    : false

/**
 * Safely composes properties from each object in `T` into a single, simplified
 * type.
 *
 * Overlapping keys with identical types are permitted; overlapping keys with
 * incompatible types cause the type to resolve to `never`.
 *
 * Drawback: this is a little slow.
 */
export type ComposeOptions<T extends object[]> = Simplify<
  T extends [infer First, ...infer Rest]
    ? First extends object
      ? Rest extends object[]
        ? ComposeOptions<Rest> extends infer Composed
          ? Composed extends object
            ? OverlapCompatible<First, Composed> extends true
              ? First & Composed
              : never
            : never
          : never
        : never
      : never
    : object
>

/**
 * Options bucket containing a `policies` prop
 */
export interface WithPolicies {
  policies?: PolicyInput
}

/**
 * Discriminated union describing where a primary policy comes from.
 *
 * Use the helper factories to construct these values:
 *
 * - {@link policySourceFromFile}
 * - {@link policySourceFromInline}
 * - {@link policySourceFromDefault}
 */
export type PolicySource =
  | { readonly kind: 'inline'; readonly policy: LavaMoatPolicy }
  | { readonly kind: 'file'; readonly path: string }
  | { readonly kind: 'default'; readonly projectRoot: string }

/**
 * Discriminated union describing where a policy override comes from (or whether
 * it does not exist).
 *
 * Use the helper factories to construct these values:
 *
 * - {@link policyOverrideSourceFromFile}
 * - {@link policyOverrideSourceFromInline}
 * - {@link policyOverrideAuto}
 * - {@link policyOverrideNone}
 */
export type PolicyOverrideSource =
  | { readonly kind: 'inline'; readonly policy: LavaMoatPolicy }
  | { readonly kind: 'file'; readonly path: string }
  | { readonly kind: 'auto'; readonly projectRoot: string }
  | { readonly kind: 'none' }

/**
 * Structured input for policy loading.
 *
 * Replaces the polymorphic / XOR-shaped option patterns in the legacy API.
 * Construct using {@link policyInput}.
 */
export type PolicyInput = {
  readonly policy: PolicySource
  readonly override: PolicyOverrideSource
}

/**
 * Options for {@link policyInput}.
 */
export type PolicyInputOptions = ComposeOptions<
  [Partial<Writable<PolicyInput>>, WithProjectRoot]
>

/**
 * An opaque wrapper around a merged {@link LavaMoatPolicy}.
 *
 * Unlike the symbol-branded {@link MergedLavaMoatPolicy}, this form survives
 * serialization. Access the underlying policy via `.policy` or
 * {@link unwrapMerged}.
 *
 * @template P The merged policy type. Default is `LavaMoatPolicy`
 */
export type Merged<P extends LavaMoatPolicy = LavaMoatPolicy> = {
  readonly policy: P
  readonly merged: true
}

/**
 * Options bucket containing a `policy` prop
 */
export interface WithPolicy {
  policy?: LavaMoatPolicy
}

/**
 * Options bucket containing a `policyOverride` prop
 */
export interface WithPolicyOverride {
  policyOverride?: LavaMoatPolicy
}

/**
 * Options for {@link load}
 */
export type LoadOptions = ComposeOptions<
  [
    Except<
      ImportLocationOptions | SyncImportLocationOptions,
      'log' | 'dev' | 'policy'
    >,
    WithReadPowersAndTrustAndEndoPolicy,
    WithLog,
    WithProdOnly,
    WithPolicy,
  ]
>

/**
 * Options for {@link execute}
 */
export type ExecuteOptions = LoadOptions
