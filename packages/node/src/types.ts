/**
 * Public-facing types for `@lavamoat/node`
 *
 * @packageDocumentation
 */

import type {
  CaptureLiteOptions,
  CryptoInterface,
  FsInterface,
  ImportLocationOptions,
  IsAbsoluteFn,
  PackagePolicy,
  PathInterface,
  Policy,
  ReadNowPowers,
  SyncImportLocationOptions,
  UrlInterface,
} from '@endo/compartment-mapper'
import type { LavaMoatPolicyOverrides } from '@lavamoat/types'
import type { IsBuiltinFn } from 'lavamoat-core'
import type { Loggerr } from 'loggerr'
import type { Except, Merge, MergeDeep, Simplify } from 'type-fest'
import {
  ENDO_GLOBAL_POLICY_ITEM_WRITE,
  ENDO_POLICY_ITEM_ROOT,
} from './constants.js'

/**
 * Options for `compartmentMapToPolicy()`
 *
 * @remarks
 * Exported due to use within {@link BaseLoadCompartmentMapOptions}
 */
export type CompartmentMapToPolicyOptions = Merge<
  BuildModuleRecordsOptions,
  Merge<WithPolicyOverride, WithDebug>
>

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

export type BaseLoadCompartmentMapOptions = Merge<
  Except<CaptureLiteOptions, 'importHook' | 'moduleTransforms'>,
  Merge<WithLog, WithDev>
>

/**
 * Options for `buildModuleRecords()`
 *
 * @remarks
 * Exported due to use within {@link CompartmentMapToPolicyOptions}
 */
export type BuildModuleRecordsOptions = Merge<
  WithReadPowers,
  Merge<WithIsBuiltin, WithLog>
>

// re-export schema
// TODO: make this less bad
export {
  BuiltinPolicy,
  DebugInfo,
  GlobalPolicy,
  GlobalPolicyRead,
  GlobalPolicyValue,
  GlobalPolicyWrite,
  LavaMoatPolicy,
  LavaMoatPolicyDebug,
  LavaMoatPolicyOverrides,
  PackagePolicy,
  PartialLavaMoatPolicy,
  Resolutions,
  ResourcePolicy,
  Resources,
} from '@lavamoat/types'

/**
 * If `dev` is `true`, `@endo/compartment-mapper` will receive a `conditions`
 * option of type `Set(['development'])`.
 *
 * If present in some options supporting `conditions`, `conditions` will take
 * precedence.
 */
export interface WithDev {
  dev?: boolean
}

export interface WithLog {
  /**
   * `Loggerr` instance for logging
   */
  log?: Loggerr
}

/**
 * Options for `generatePolicy()`
 *
 * @remarks
 * {@link Merge} is appropriate here since some of the prop types are overwritten
 * by others (e.g., {@link WithRawPowers.fs} vs {@link WritePolicyOptions.fs},
 * where the latter should overwrite the former).
 * @privateRemarks
 * Somebody feel free to create a `MergeMany` type.
 */
export type GeneratePolicyOptions = Merge<
  BaseLoadCompartmentMapOptions,
  Merge<
    CompartmentMapToPolicyOptions,
    Merge<
      WritePolicyOptions,
      {
        /**
         * A function like Node's `path.isAbsolute()`.
         *
         * This is _not_ the same as {@link ReadNowPowers.isAbsolute}; it is only
         * used for finding the entry point and does not affect runtime
         * operation.
         */
        isAbsolute?: IsAbsoluteFn
      }
    >
  >
>

/**
 * Params to LavaMoat's global attenuator
 */
export type GlobalAttenuatorParams = [LavaMoatGlobalPolicyItem]

/**
 * `@lavamoat/node`'s customized Endo policy, with support for our global
 * attenuator.
 */
export type LavaMoatEndoPolicy = Policy<
  LavaMoatPackagePolicyItem,
  LavaMoatGlobalPolicyItem,
  void,
  LavaMoatPackagePolicyOptions
>

/**
 * Extends Endo's `PolicyItem` with the special {@link RootPolicy} and
 * {@link WritablePropertyPolicy}
 */
export type LavaMoatGlobalPolicyItem = RootPolicy | WritablePropertyPolicy

/**
 * Package policy based on {@link LavaMoatPackagePolicyItem} and
 * {@link LavaMoatGlobalPolicyItem}.
 *
 * Member of {@link LavaMoatEndoPolicy}
 */
export type LavaMoatPackagePolicy = PackagePolicy<
  LavaMoatPackagePolicyItem,
  LavaMoatGlobalPolicyItem,
  void,
  LavaMoatPackagePolicyOptions
>

/**
 * Extends Endo's `PolicyItem` with the special {@link RootPolicy}
 */
export type LavaMoatPackagePolicyItem = RootPolicy

/**
 * Custom data potentially assigned to the `options` prop of an
 * {@link PackagePolicy.options Endo package policy}
 */
export interface LavaMoatPackagePolicyOptions {
  /**
   * If this is `true`, then the package is allowed to run native modules
   */
  native?: boolean
}

/**
 * "Root" identifier for a LavaMoat global policy item in the context of an Endo
 * policy
 */
export type RootPolicy = typeof ENDO_POLICY_ITEM_ROOT

/**
 * Options for `run()`
 */

export type RunOptions = Merge<
  WithRawReadPowers,
  Merge<WithPolicyOverride, WithDev>
>

/**
 * Options for `execute()`
 */
export type ExecuteOptions = Simplify<
  ImportLocationOptions | SyncImportLocationOptions
>

/**
 * Options for `toEndoPolicy()`
 */
export type ToEndoPolicyOptions =
  | {
      /**
       * Path to a policy override file.
       */
      policyOverridePath?: string | URL

      /**
       * Disallowed in lieu of {@link policyOverridePath}
       */
      policyOverride?: never
    }
  | {
      /**
       * Disallowed in lieu of {@link policyOverride}
       */
      policyOverridePath?: never
      /**
       * A policy override object.
       */
      policyOverride?: LavaMoatPolicyOverrides
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
 * Options which may either {@link WithReadPowers} or {@link WithRawPowers} but
 * not both.
 */
export type WithRawReadPowers = WithReadPowers | WithRawPowers

/**
 * Raw powers which can be converted to a {@link ReadNowPowers} object.
 *
 * For this to work, {@link WithRawPowers.fs} must be defined. It cannot contain
 * a `readPowers` property.
 */
export interface WithRawPowers {
  crypto?: CryptoInterface
  fs: FsInterface
  path?: PathInterface
  readPowers?: never
  url?: UrlInterface
}

/**
 * Options for _our_ `makeReadPowers()` function
 */
export type MakeReadPowersOptions = WithRawReadPowers

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
 * Superset of {@link FsInterface} necessary to write a policy to disk
 */
export type WritableFsInterface = MergeDeep<
  FsInterface,
  { promises: WritePowers }
>
/**
 * "Writable" identifier for a LavaMoat global policy item in the context of an
 * Endo policy
 */
export type WritePolicy = typeof ENDO_GLOBAL_POLICY_ITEM_WRITE

/**
 * A "create a debug policy" flag
 */
export interface WithDebug {
  /**
   * If `true`, generate a debug policy.
   */
  debug?: boolean
}

/**
 * Options having a `policyOverride` property.
 */
export interface WithPolicyOverride {
  /**
   * Policy overrides, if any
   */
  policyOverride?: LavaMoatPolicyOverrides
}

/**
 * Like Endo's `PropertyPolicy`, but can be a {@link WritePolicy} instead of just
 * `boolean`.
 */
export interface WritablePropertyPolicy {
  [k: string]: WritePolicy | boolean
}

/**
 * Options available when writing a policy
 */
export interface WritePolicyOptions {
  /**
   * Path to a {@link LavaMoatPolicyDebug} file
   */
  policyDebugPath?: string
  /**
   * Path to a {@link LavaMoatPolicy} file
   */
  policyPath?: string
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
}

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
