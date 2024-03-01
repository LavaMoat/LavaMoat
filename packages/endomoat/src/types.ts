import {
  CryptoInterface,
  PathInterface,
  ReadNowPowers,
  UrlInterface,
  type CaptureOptions,
  type FsInterface,
  type PackagePolicy,
  type Policy,
  type PropertyPolicy,
} from '@endo/compartment-mapper'
import { type LavaMoatPolicyOverrides } from 'lavamoat-core'
import { Merge, MergeDeep, type Except, type Simplify } from 'type-fest'

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
 * A subset of unique options for {@link GeneratePolicyOptions}
 */
export interface BaseGeneratePolicyOptions {
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
 */
export type GeneratePolicyOptions = Simplify<
  BaseLoadCompartmentMapOptions &
    BaseGeneratePolicyOptions &
    WithReadPowers &
    WithPolicyOverride &
    WritePolicyOptions
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
export type LoadCompartmentMapOptions = Simplify<
  BaseLoadCompartmentMapOptions & WithReadPowers
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
 * Options for the `PolicyGenerator` constructor
 *
 * @internal
 */
export type PolicyGeneratorOptions = Simplify<
  WithReadPowers & WithPolicyOverride
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
export type RootPolicy = 'root'

/**
 * "Writable" identifier for a LavaMoat global policy item in the context of an
 * Endo policy
 */
export type WritePolicy = 'write'

/**
 * Extends Endo's `PolicyItem` with the special {@link RootPolicy} and
 * {@link WritePolicy}
 */
export type LavaMoatGlobalPolicyItem = RootPolicy | WritePolicy

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
 * Custom data potentially assigned to the `options` prop of an Endo package
 * policy
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
 * Params to LavaMoat's global attenuator
 */
export type GlobalAttenuatorParams = [LavaMoatGlobalPolicyItem | PropertyPolicy]

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
