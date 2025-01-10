/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Public types for `@lavamoat/node`
 *
 * @packageDocumentation
 */
import type { LavaMoatPolicy, Resources } from '@lavamoat/types'
import type { IsBuiltinFn } from 'lavamoat-core'
import type { Loggerr } from 'loggerr'
import type nodeFs from 'node:fs'
import type { SetFieldType, Simplify } from 'type-fest'

import type {
  CaptureLiteOptions,
  CryptoInterface,
  FsInterface,
  ImportLocationOptions,
  PackagePolicy,
  PathInterface,
  Policy,
  ReadNowPowers,
  SyncImportLocationOptions,
  UrlInterface,
} from '@endo/compartment-mapper'
import type { PathLike, Stats } from 'node:fs'
import type {
  ENDO_GLOBAL_POLICY_ITEM_WRITE,
  ENDO_POLICY_ITEM_ROOT,
} from './constants.js'
import { type CompartmentMapToPolicyOptions } from './internal.js'

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
 * A "create a debug policy" flag
 */
export interface WithDebug {
  /**
   * If `true`, generate a debug policy.
   */
  debug?: boolean
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

/**
 * Options having a `policyOverride` or `policyOverridePath` property (not both
 * at once!)
 */
export type WithPolicyOverrideOrPath =
  | WithPolicyOverrideOnly
  | WithPolicyOverridePathOnly

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

export interface WithPolicyOverride {
  policyOverride?: LavaMoatPolicy
}

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

export interface WithTrustRoot {
  trustRoot?: boolean
}

export interface ScuttleGlobalThisOptions {
  enabled?: boolean
  exceptions?: string[]
  scuttlerName?: string
}

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
export interface WritePolicyOptions {
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

/**
 * Options to pass-through to Endo.
 *
 * Used by {@link GeneratePolicyOptions}.
 *
 * The {@link CaptureLiteOptions.dev dev} property defaults to `true`.
 *
 * @remarks
 * Omitted properties cannot by overridden by the user. Exported due to use
 * within {@link GeneratePolicyOptions}.
 */

export type BaseLoadCompartmentMapOptions = Simplify<
  Omit<CaptureLiteOptions, 'importHook' | 'moduleTransforms' | 'log'> &
    WithLog &
    WithDev
>

/**
 * Options for `buildModuleRecords()`
 *
 * @remarks
 * Exported due to use within {@link CompartmentMapToPolicyOptions}
 */
export type BuildModuleRecordsOptions = Simplify<
  WithReadPowers & WithIsBuiltin & WithLog
>

/**
 * Options for `compartmentMapToPolicy()` wherein a `LavaMoatDebugPolicy` will
 * be generated
 */
export type CompartmentMapToDebugPolicyOptions = SetFieldType<
  CompartmentMapToPolicyOptions,
  'debug',
  true
>

/**
 * "Writable" identifier for a LavaMoat global policy item in the context of an
 * Endo policy
 */
export type EndoWritePolicy = typeof ENDO_GLOBAL_POLICY_ITEM_WRITE

/**
 * Options for `execute()`
 */
export type ExecuteOptions = Simplify<
  Omit<ImportLocationOptions | SyncImportLocationOptions, 'log'> &
    WithLog &
    WithReadPowers
>

/**
 * Options for `generatePolicy()`
 */
export type GeneratePolicyOptions = Simplify<
  BaseLoadCompartmentMapOptions &
    CompartmentMapToPolicyOptions &
    WritePolicyOptions &
    WithTrustRoot &
    WithScuttleGlobalThis &
    WithPolicyOverridePath &
    WithReadFile &
    WithProjectRoot
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
export type LavaMoatEndoPolicy = Policy<
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

export type RunOptions = Simplify<
  WithRawReadPowers &
    WithDev &
    WithTrustRoot &
    WithScuttleGlobalThis &
    WithLog &
    WithProjectRoot &
    WithPolicyOverrideOrPath &
    WithReadFile
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
export type ToEndoPolicyOptions = Simplify<
  WithProjectRoot & WithPolicyOverrideOrPath & WithLog
>
/**
 * Options which may either {@link WithReadPowers} or {@link WithRawPowers} but
 * not both.
 */
export type WithRawReadPowers = WithReadPowers | WithRawPowers

export type * from '@lavamoat/types'

export type * from './errors.js'

/**
 * Options for `loadPolicies()`
 */
export type LoadPoliciesOptions = Simplify<
  WithProjectRoot & WithReadFile & WithPolicyOverrideOrPath
>

/**
 * Options bucket containing a `readFile` prop
 */
export type WithReadFile = Simplify<{
  readFile?: ReadFileFn
}>

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

export interface WithPolicy {
  policy?: Partial<LavaMoatPolicy<Resources>>
}

export type MakeGlobalsAttenuatorOptions = Simplify<
  WithPolicy & WithScuttleGlobalThis
>
