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
  CaptureLiteOptions,
  CryptoInterface,
  Policy as EndoPolicy,
  FsInterface,
  ImportLocationOptions,
  PackagePolicy,
  PathInterface,
  ReadNowPowers,
  SyncImportLocationOptions,
  UrlInterface,
} from '@endo/compartment-mapper'
import type { LavaMoatPolicy, Resources } from '@lavamoat/types'
import type { IsBuiltinFn, LavaMoatScuttleOpts } from 'lavamoat-core'
import type { Loggerr } from 'loggerr'
import type nodeFs from 'node:fs'
import type { PathLike, Stats } from 'node:fs'
import type { Except, LiteralUnion, Simplify } from 'type-fest'
import type {
  ATTENUATORS_COMPARTMENT,
  ENDO_GLOBAL_POLICY_ITEM_WRITE,
  ENDO_POLICY_ITEM_ROOT,
  LAVAMOAT_PKG_POLICY_ROOT,
  MERGED_POLICY_FIELD,
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

/**
 * Options having a `prodOnly` property
 */
export interface WithProdOnly {
  /**
   * This is the negation of `@endo/compartment-mapper`'s
   * `MapNodeModulesOptions.dev` option.
   *
   * @defaultValue `false`
   */
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

/**
 * Options having a `log` property
 */
export interface WithLog {
  /**
   * `Loggerr` instance for logging
   */
  log?: Loggerr
}

/**
 * Options having a `policyPath` prop
 */
export interface WithPolicyPath {
  policyPath?: string | URL
}

/**
 * Options having a `policy` prop and _not_ a `policyPath` prop
 */
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
 * Options having a `policyOverride` property and _not_ a `policyOverridePath`
 */
export interface WithPolicyOverrideOnly extends WithPolicyOverride {
  /**
   * Disallowed in lieu of {@link policyOverride}
   */
  policyOverridePath?: never
}

/**
 * Options having a `policyOverridePath` property and _not_ a `policyOverride`
 */
export interface WithPolicyOverridePathOnly extends WithPolicyOverridePath {
  /**
   * Disallowed in lieu of {@link policyOverridePath}
   */
  policyOverride?: never
}

/**
 * Options having a `policyOverride` _xor_ `policyOverridePath` property (not
 * both at once!)
 */
export type WithPolicyOverrideOrPath =
  | WithPolicyOverrideOnly
  | WithPolicyOverridePathOnly

/**
 * Options having a `policyOverride` property
 */
export interface WithPolicyOverride {
  policyOverride?: LavaMoatPolicy
}

/**
 * Options having a `policyOverridePath` property
 */
export interface WithPolicyOverridePath {
  policyOverridePath?: string | URL
}

/**
 * Interfaces which can be used to build a {@link ReadNowPowers} object.
 *
 * For this to work, {@link PowerBuilders.fs} _must_ be defined. It cannot
 * contain a `readPowers` property.
 */
export interface PowerBuilders {
  crypto?: CryptoInterface
  fs: FsInterface
  path?: PathInterface
  url?: UrlInterface
}

/**
 * Options having a `readPowers` property.
 */
export interface WithReadPowers {
  /**
   * Read powers to use when loading the compartment map.
   */
  readPowers?: ReadNowPowers
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

/**
 * Options for `captureFromMap()` via {@link generatePolicy}
 *
 * Disallows properties which are overwritten by LavaMoat.
 */
export type ConsumerCaptureFromMapOptions = Except<
  CaptureLiteOptions,
  | 'importHook'
  | 'log'
  | '_preload'
  | 'parserForLanguage'
  | 'packageConnectionsHook'
  | 'moduleSourceHook'
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

/**
 * Options for `execute()`
 */
export type ExecuteOptions = ComposeOptions<
  [
    Except<
      ImportLocationOptions | SyncImportLocationOptions,
      'log' | 'dev' | 'policy'
    >,
    WithReadPowers,
    WithTrustRoot,
    WithLavaMoatEndoPolicy,
    WithLog,
    WithProdOnly,
    WithPolicyOnly,
    WithProjectRoot,
  ]
>

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
    WithReadPowers,
    WithTrustRoot,
    WithIsBuiltin,
    WithLog,
    WithProdOnly,
    ConsumerCaptureFromMapOptions,
    WithScuttleGlobalThis,
    LoadPoliciesOptions,
    WithCompact,
  ]
>

/**
 * Result of `generatePolicy()`
 */
export interface GeneratePolicyResult {
  policy: MergedLavaMoatPolicy
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
export type MakeReadPowersOptions = WithReadPowersXorBuilders

/**
 * Options for `run()`
 */

export type RunOptions = ComposeOptions<
  [
    WithReadPowersXorBuilders,
    WithProdOnly,
    WithTrustRoot,
    WithScuttleGlobalThis,
    WithLog,
    WithPolicyPath,
    LoadPoliciesOptions,
    WithPolicy,
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
  projectRoot?: string
}

/**
 * Options for `toEndoPolicy()`
 */
export type ToEndoPolicyOptions = ComposeOptions<
  [WithPolicyOverrideOrPath, WithLog, WithProjectRoot]
>

/**
 * Used when the first parameter to `toEndoPolicy()` is a
 * {@link MergedLavaMoatPolicy}
 */
export type ToEndoPolicyOptionsWithoutPolicyOverride = ComposeOptions<
  [
    Except<ToEndoPolicyOptions, 'policyOverridePath' | 'policyOverride'>,
    { policyOverride?: never; policyOverridePath?: never },
  ]
>

/**
 * Options which may either {@link WithReadPowers} or {@link PowerBuilders} but
 * not both.
 */
export type WithReadPowersXorBuilders = Simplify<
  | (WithReadPowers & { [k in keyof PowerBuilders]?: never })
  | (PowerBuilders & { [k in keyof WithReadPowers]?: never })
>

/**
 * Options containing a `policy` prop
 *
 * @template T The type of the resources in the policy
 */
export interface WithPolicy<T extends Resources = Resources> {
  policy?: LavaMoatPolicy<T>
}

/**
 * Options for `loadPolicies()`
 */
export type LoadPoliciesOptions = ComposeOptions<
  [
    WithProjectRoot,
    WithReadFile,
    WithPolicyOverride,
    WithPolicyOverridePath,
    WithPolicyPath,
  ]
>

/**
 * A potential label within compartments of a
 * {@link PackageCompartmentMapDescriptor}
 */
export type CanonicalName = LiteralUnion<
  typeof LAVAMOAT_PKG_POLICY_ROOT | typeof ATTENUATORS_COMPARTMENT,
  string
>

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
  RootPolicy
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
 * with {@link PowerBuilders})
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

export type MergedLavaMoatPolicy = LavaMoatPolicy & {
  [MERGED_POLICY_FIELD]: true
}

export type UnmergedLavaMoatPolicy = LavaMoatPolicy & {
  [MERGED_POLICY_FIELD]?: never
}

export type { Except, LiteralUnion, Simplify } from 'type-fest'
