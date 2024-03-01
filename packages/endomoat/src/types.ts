import {
  type FsAPI,
  type PackagePolicy,
  type Policy,
  type PropertyPolicy,
} from '@endo/compartment-mapper'
import { Merge, MergeDeep } from 'type-fest'
import { GeneratePolicyOptions, WithAnyReadPowers } from './policy-gen/types.js'

/**
 * Options for `run` w/o automatic policy generation
 */
export type RunOptions = WithAnyReadPowers

/**
 * Options for `run` w/ automatic policy generation
 */
export type GenerateAndRunOptions = Merge<
  GeneratePolicyOptions,
  WithAnyReadPowers
>

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
  LavaMoatGlobalPolicyItem
>

/**
 * An Endo policy tailored to LavaMoat's default attenuator
 */
export type LavaMoatEndoPolicy = Policy<
  LavaMoatPackagePolicyItem,
  LavaMoatGlobalPolicyItem
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
 * Superset of {@link FsAPI} necessary to write a policy to disk
 */
export type WritableFsAPI = MergeDeep<FsAPI, { promises: WritePowers }>
