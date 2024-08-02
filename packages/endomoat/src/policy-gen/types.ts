import {
  type CaptureOptions,
  type FsAPI,
  type ReadPowers,
} from '@endo/compartment-mapper'
import { type LavaMoatPolicyOverrides } from 'lavamoat-core'
import { type Except, type Simplify } from 'type-fest'
import { type WritableFsAPI } from '../types.js'

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
 * Options having a `readPowers` property.
 */
export interface WithReadPowers {
  /**
   * Read powers to use when loading the compartment map.
   */
  readPowers?: ReadPowers
}

/**
 * Options having a `readPowers` property also accepting an {@link FsAPI
 * `fs`-like object
 */
export interface WithReadPowersOrFsAPI {
  /**
   * Read powers to use when loading the compartment map.
   */
  readPowers?: ReadPowers | FsAPI
}

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
    WithReadPowersOrFsAPI &
    WithPolicyOverride &
    WritePolicyOptions
>

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
  fs?: WritableFsAPI
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
