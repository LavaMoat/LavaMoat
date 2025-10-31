/* eslint-disable @typescript-eslint/no-explicit-any */
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
  PackagePolicy,
  PathInterface,
  ReadNowPowers,
  SyncImportLocationOptions,
  UrlInterface,
} from '@endo/compartment-mapper'
import type { LavaMoatPolicy } from '@lavamoat/types'
import type { IsBuiltinFn } from 'lavamoat-core'
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

export interface WithDev {
  dev?: boolean
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

export interface WithPolicyPathOnly {
  /**
   * Disallowed in lieu of {@link policy}
   */
  policy?: never
  /**
   * Path to a policy file.
   */
  policyPath?: string | URL
}

export type WithPolicyOrPath = WithPolicyOnly | WithPolicyPathOnly

/**
 * Options having a `policyOverride` property and _not_ a `policyOverridePath`
 */
export type WithPolicyOverrideOnly = {
  /**
   * Disallowed in lieu of {@link policyOverride}
   */
  policyOverridePath?: never
  /**
   * A policy override object.
   */
  policyOverride?: LavaMoatPolicy
}

/**
 * Options having a `policyOverridePath` property and _not_ a `policyOverride`
 */
export type WithPolicyOverridePathOnly = {
  /**
   * Path to a policy override file.
   */
  policyOverridePath?: string | URL

  /**
   * Disallowed in lieu of {@link policyOverridePath}
   */
  policyOverride?: never
}

/**
 * Options having a `policyOverride` or `policyOverridePath` property (not both
 * at once!)
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
 * Options for `scuttleGlobalThis`
 */
export interface ScuttleGlobalThisOptions {
  enabled?: boolean
  exceptions?: string[]
  scuttlerName?: string
}

/**
 * Options having a `scuttleGlobalThis` property
 */
export interface WithScuttleGlobalThis {
  scuttleGlobalThis?: boolean | ScuttleGlobalThisOptions
}

/**
 * Superset of {@link FsInterface} necessary to write a policy to disk
 */
export interface WritableFsInterface {
  promises: WritePowers
}

/**
 * Options available when writing a policy
 */
export interface WithWritePolicyOptions {
  /**
   * Path to a {@link LavaMoatPolicyDebug} file
   */
  policyDebugPath?: string | URL

  /**
   * Path to a {@link LavaMoatPolicy} file
   */
  policyPath?: string | URL

  /**
   * `fs` interface to write policy to disk.
   *
   * This is _only_ used to read and write policy to disk and does not affect
   * runtime operation.
   */
  writableFs?: WritableFsInterface

  /**
   * Whether or not to actually perform the write operation.
   *
   * @defaultValue false
   */
  write?: boolean
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
    Except<ImportLocationOptions, 'importHook' | 'log' | 'preload'>,
    WithLog,
    WithDev,
  ]
>

/**
 * "Writable" identifier for a LavaMoat global policy item in the context of an
 * Endo policy
 */
export type EndoWritePolicy = typeof ENDO_GLOBAL_POLICY_ITEM_WRITE

/**
 * Options for `execute()`
 */
export type ExecuteOptions = ComposeOptions<
  [
    Except<
      ImportLocationOptions | SyncImportLocationOptions,
      'log' | 'dev' | 'policy'
    >,
    WithLavaMoatEndoPolicy,
    WithLog,
    WithReadPowers,
    WithDev,
    WithTrustRoot,
    WithPolicyOnly,
  ]
>

export interface WithLavaMoatEndoPolicy {
  endoPolicy?: LavaMoatEndoPolicy
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
    WithIsBuiltin,
    WithLoadForMapOptions,
    WithWritePolicyOptions,
    WithPolicyOverrideOrPath,
    WithTrustRoot,
    WithScuttleGlobalThis,
    WithReadFile,
    WithProjectRoot,
  ]
>

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
    WithDev,
    WithTrustRoot,
    WithScuttleGlobalThis,
    WithLog,
    WithProjectRoot,
    WithPolicyOverrideOrPath,
    WithPolicyOrPath,
    WithReadFile,
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
 * Options which may either {@link WithReadPowers} or {@link WithRawPowers} but
 * not both.
 */
export type WithRawReadPowers = WithReadPowers | WithRawPowers

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
  RootPolicy,
} from '@lavamoat/types'

export type * from './errors.js'

/**
 * Options for `loadPolicies()`
 */
export type LoadPoliciesOptions = ComposeOptions<
  [WithProjectRoot, WithReadFile, WithPolicyOverrideOrPath]
>

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
 * Safely composes properties from each object in `T` into a single, simplified
 * type.
 *
 * If `T` contains objects with non-exclusive keys, then the type will resolve
 * to `never`.
 *
 * Drawback: this is a little slow.
 */
export type ComposeOptions<T extends object[]> = Simplify<
  T extends [infer First, ...infer Rest]
    ? First extends object
      ? Rest extends object[]
        ? keyof First extends keyof ComposeOptions<Rest>
          ? never
          : First & ComposeOptions<Rest>
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

export interface PolicyCanonicalNameInfo {
  name: CanonicalName
  source: string
}
