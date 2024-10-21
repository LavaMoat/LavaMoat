import {
  CryptoInterface,
  PathInterface,
  ReadNowPowers,
  UrlInterface,
  type CaptureOptions,
  type FsInterface,
  type PackagePolicy,
  type Policy,
} from '@endo/compartment-mapper'
import { type LavaMoatPolicyOverrides } from 'lavamoat-core'
import { Merge, MergeDeep, type Except, type Simplify } from 'type-fest'
import {
  ENDO_GLOBAL_POLICY_ITEM_WRITE,
  ENDO_POLICY_ITEM_ROOT,
} from './constants.js'

/**
 * Options to pass-through to Endo.
 *
 * Used by {@link GeneratePolicyOptions}.
 *
 * The {@link EndoArchiveOptions.dev dev} property defaults to `true`.
 *
 * @remarks
 * Omitted properties cannot by overridden by the user.
 */
export type BaseLoadCompartmentMapOptions = Except<
  CaptureOptions,
  'importHook' | 'moduleTransforms'
>

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
 * Options for `generatePolicy`
 *
 * @remarks
 * {@link Merge} is appropriate here since some of the prop types are overwritten
 * by others (e.g., {@link WithReadPowers.fs} vs {@link WritePolicyOptions.fs},
 * where the latter should overwrite the former).
 * @privateRemarks
 * Somebody feel free to create a `MergeMany` type.
 */
export type GeneratePolicyOptions = Merge<
  BaseLoadCompartmentMapOptions,
  Merge<
    WithDebug,
    Merge<WithReadPowers, Merge<WithPolicyOverride, WritePolicyOptions>>
  >
>

/**
 * Options having a `readPowers` property.
 */
export interface WithReadPowers {
  /**
   * Read powers to use when loading the compartment map.
   */
  readPowers?: ReadNowPowers
  fs?: FsInterface
  crypto?: CryptoInterface
  path?: PathInterface
  url?: UrlInterface
}

/**
 * Options for internal `generate` function
 *
 * @internal
 */
export type GenerateOptions = Except<
  GeneratePolicyOptions,
  keyof WritePolicyOptions
>

/**
 * Options available when writing a policy
 */
export interface WritePolicyOptions {
  policyDebugPath?: string
  policyPath?: string
  fs?: WritableFsInterface
  write?: boolean
}

/**
 * Options for `loadCompartmentMap`
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
export type PolicyGeneratorContextOptions = Simplify<
  WithReadPowers & {
    /**
     * If `true`, the `PolicyGeneratorContext` represents the entry compartment
     */
    isEntry?: boolean
  }
>

/**
 * Options for `compartmentMapToPolicy()`
 *
 * @internal
 */
export type CompartmentMapToPolicyOptions = Merge<
  WithReadPowers,
  Merge<WithPolicyOverride, WithDebug>
>

/**
 * Options for `run` w/o automatic policy generation
 */
export type RunOptions = Merge<WithReadPowers, WithFsInterface>

export type WithFsInterface = { fs?: FsInterface }

/**
 * Options for `run` w/ automatic policy generation
 */
export type GenerateAndRunOptions = Merge<RunOptions, GeneratePolicyOptions>

/**
 * "Root" identifier for a LavaMoat global policy item in the context of an Endo
 * policy
 */
export type RootPolicy = typeof ENDO_POLICY_ITEM_ROOT

/**
 * "Writable" identifier for a LavaMoat global policy item in the context of an
 * Endo policy
 */
export type WritePolicy = typeof ENDO_GLOBAL_POLICY_ITEM_WRITE

/**
 * Extends Endo's `PolicyItem` with the special {@link RootPolicy} and
 * {@link WritePolicy}
 */
export type LavaMoatGlobalPolicyItem = RootPolicy | WritablePropertyPolicy

/**
 * Extends Endo's `PolicyItem` with the special {@link RootPolicy}
 */
export type LavaMoatPackagePolicyItem = RootPolicy

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
 * Custom data potentially assigned to the `options` prop of an
 * {@link PackagePolicy.options Endo package policy}
 */
export type LavaMoatPackagePolicyOptions = {
  /**
   * If this is `true`, then the package is allowed to run native modules
   */
  native?: boolean
}

/**
 * An Endo policy tailored to LavaMoat's default attenuator
 */
export type LavaMoatEndoPolicy = Policy<
  LavaMoatPackagePolicyItem,
  LavaMoatGlobalPolicyItem,
  void,
  LavaMoatPackagePolicyOptions
>

/**
 * Like Endo's `PropertyPolicy`, but can be a {@link WritePolicy} instead of just
 * `boolean`.
 */
export interface WritablePropertyPolicy {
  [k: string]: WritePolicy | boolean
}

/**
 * Params to LavaMoat's global attenuator
 */
export type GlobalAttenuatorParams = [LavaMoatGlobalPolicyItem]

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
 * Superset of {@link FsInterface} necessary to write a policy to disk
 */
export type WritableFsInterface = MergeDeep<
  FsInterface,
  { promises: WritePowers }
>

/**
 * Options for `toEndoPolicy`
 */
export type ToEndoPolicyOptions =
  | {
      /**
       * Path to a policy override file.
       */
      policyOverridePath?: string | URL
      policyOverride: never
    }
  | {
      policyOverridePath: never
      /**
       * A policy override object.
       */
      policyOverride?: LavaMoatPolicyOverrides
    }
