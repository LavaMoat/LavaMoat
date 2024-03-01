import {
  ReadFn,
  type ArchiveOptions as EndoArchiveOptions,
  type FsAPI,
  type ReadPowers,
} from '@endo/compartment-mapper'
import { type LavaMoatPolicyOverrides } from 'lavamoat-core'
import { type Simplify } from 'type-fest'
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
export type ArchiveOptions = Omit<
  EndoArchiveOptions,
  'readPowers' | 'importHook' | 'moduleTransforms' | 'extraParsers'
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
 * Options having a `readPowers` property also accepting an
 * {@link FsAPI `fs`-like object} or {@link ReadFn}.
 */
export interface WithAnyReadPowers {
  /**
   * Read powers to use when loading the compartment map.
   */
  readPowers?: ReadPowers | FsAPI | ReadFn
}

/**
 * Options having a `debug` property.
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
 */
export type GeneratePolicyOptions = Simplify<
  ArchiveOptions &
    WithAnyReadPowers &
    WithPolicyOverride &
    WithDebug &
    WritePolicyOptions
>

/**
 * Options for internal `generate` function
 *
 * @internal
 */
export type GenerateOptions = Omit<
  GeneratePolicyOptions,
  keyof WritePolicyOptions
>

export interface WritePolicyOptions {
  policyDebugPath?: string
  policyPath?: string
  fs?: WritableFsAPI

  write?: boolean
}

export type GenerateAndWritePolicyOptions = GeneratePolicyOptions

/**
 * Options for `loadCompartmentMap`
 *
 * @internal
 */
export type LoadCompartmentMapOptions = Simplify<
  ArchiveOptions & WithReadPowers
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
