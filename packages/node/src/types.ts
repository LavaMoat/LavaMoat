/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  CryptoInterface,
  IsAbsoluteFn,
  PathInterface,
  ReadNowPowers,
  UrlInterface,
  type CaptureLiteOptions,
  type FsInterface,
  type PackagePolicy,
  type Policy,
} from '@endo/compartment-mapper'
import { IsBuiltinFn, type LavaMoatPolicyOverrides } from 'lavamoat-core'
import { Loggerr } from 'loggerr'
import { Merge, MergeDeep, type Except } from 'type-fest'
import {
  ENDO_GLOBAL_POLICY_ITEM_WRITE,
  ENDO_POLICY_ITEM_ROOT,
} from './constants.js'

/**
 * Options to pass-through to Endo.
 *
 * Used by {@link GeneratePolicyOptions}.
 *
 * The {@link CaptureLiteOptions.dev dev} property defaults to `true`.
 *
 * @remarks
 * Omitted properties cannot by overridden by the user.
 */
export type BaseLoadCompartmentMapOptions = Merge<
  Except<CaptureLiteOptions, 'importHook' | 'moduleTransforms'>,
  Merge<WithLog, WithDev>
>

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

/**
 * Options for `buildModuleRecords()`
 *
 * @internal
 */
export type BuildModuleRecordsOptions = Merge<
  WithReadPowers,
  Merge<WithIsBuiltin, WithLog>
>

/**
 * Options for `compartmentMapToPolicy()`
 *
 * @internal
 */
export type CompartmentMapToPolicyOptions = Merge<
  BuildModuleRecordsOptions,
  Merge<WithPolicyOverride, WithDebug>
>

/**
 * Options for `run()` w/ automatic policy generation enabled
 */
export type GenerateAndRunOptions = Merge<RunOptions, GeneratePolicyOptions>

/**
 * Options for `generate()` function
 *
 * @internal
 */
export type GenerateOptions = Except<
  GeneratePolicyOptions,
  keyof WritePolicyOptions | 'isAbsolute'
>

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
 * Options for `loadCompartmentMap()`
 *
 * @internal
 */
export type LoadCompartmentMapOptions = Merge<
  BaseLoadCompartmentMapOptions,
  Merge<WithReadPowers, WithPolicyOverride>
>

/**
 * Options for the `PolicyGeneratorContext` constructor
 *
 * @internal
 */
export type PolicyGeneratorContextOptions = Merge<
  WithReadPowers,
  Merge<
    WithIsBuiltin,
    Merge<
      WithLog,
      {
        /**
         * If `true`, the `PolicyGeneratorContext` represents the entry
         * compartment
         */
        isEntry?: boolean

        /**
         * If missing modules are to be tracked and summarized, this should be
         * the same `Map` passed into every call to
         * `PolicyGeneratorContext.create()`.
         *
         * `PolicyGeneratorContext` will populate this data structure with the
         * names of missing modules per compartment.
         */
        missingModules?: MissingModuleMap
      }
    >
  >
>

export type MissingModuleMap = Map<string, Set<string>>

/**
 * "Root" identifier for a LavaMoat global policy item in the context of an Endo
 * policy
 */
export type RootPolicy = typeof ENDO_POLICY_ITEM_ROOT

/**
 * Options for `run()` w/o automatic policy generation
 */

export type RunOptions = Merge<WithRawReadPowers, WithDev>

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
  readPowers?: never
  fs?: FsInterface
  crypto?: CryptoInterface
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

  fs?: never
  crypto?: never
  path?: never
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
   * `fs` interface to write policy to disk.
   *
   * This is _only_ used to read and write policy to disk and does not affect
   * runtime operation.
   */
  writableFs?: WritableFsInterface

  /**
   * Path to a {@link LavaMoatPolicyDebug} file
   */
  policyDebugPath?: string

  /**
   * Path to a {@link LavaMoatPolicy} file
   */
  policyPath?: string

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
 * A `globalThis` object with unknown properties.
 *
 * This is basically just an object with anything in it, since we cannot be sure
 * that any given global property is present (or what its type is) in the
 * current compartment at any given time.
 */
export type SomeGlobalThis = Record<PropertyKey, unknown>

/**
 * A function _or_ a constructor.
 *
 * @privateRemarks
 * I'm not entirely sure why `Function` does not satify one of the first two
 * union members, but it has to be here.
 * @internal
 */
export type SomeFunction =
  | (new (...args: any[]) => any)
  | ((...args: any[]) => any)
  // eslint-disable-next-line @typescript-eslint/ban-types
  | Function

/**
 * The parameters of a {@link SomeFunction}
 *
 * @template T Function or constructor
 * @internal
 */
export type SomeParameters<T extends SomeFunction> = T extends new (
  ...args: any[]
) => any
  ? ConstructorParameters<T>
  : T extends (...args: any[]) => any
    ? Parameters<T>
    : never

/**
 * Callback used by `wrapFunctionConstructor`.
 *
 * Given context object `context`, returns `true` if a function being wrapped
 * (not shown) should be called with a provided context (also not shown).
 *
 * @param context Usually a `globalThis`
 * @internal
 */
export type ContextTestFn = (context: object) => boolean
