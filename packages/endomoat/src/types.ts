import {
  type FsAPI,
  type PackagePolicy,
  type Policy,
  type PropertyPolicy,
  type ReadFn,
  type ReadPowers,
} from '@endo/compartment-mapper'

/**
 * Options for `run`
 */
export interface RunOptions {
  readPowers?: ReadFn | ReadPowers
}

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

export interface WritePowers {
  mkdir: (
    path: string,
    { recursive }: { recursive: true }
  ) => Promise<string | undefined>
  writeFile: (path: string, data: string) => Promise<void>
}

export type WritableFsAPI = FsAPI & {
  promises: FsAPI['promises'] & WritePowers
}
