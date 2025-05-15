/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Public types for `@lavamoat/node`
 *
 * @packageDocumentation
 */
import type {
  CaptureLiteOptions,
  CompartmentDescriptor,
  CompartmentMapDescriptor,
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
import type { IsBuiltinFn, LavaMoatPolicy } from 'lavamoat-core'
import type { Loggerr } from 'loggerr'
import type nodeFs from 'node:fs'
import type { PathLike, Stats } from 'node:fs'
import type { LiteralUnion, SetFieldType, Simplify } from 'type-fest'
import type {
  ATTENUATORS_COMPARTMENT,
  ENDO_GLOBAL_POLICY_ITEM_WRITE,
  ENDO_POLICY_ITEM_ROOT,
  LAVAMOAT_PKG_POLICY_ROOT,
} from './constants.js'

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
  Omit<ImportLocationOptions | SyncImportLocationOptions, 'log' | 'dev'> &
    WithLog &
    WithReadPowers &
    WithDev &
    WithCompartmentDescriptorDecorators &
    WithTrustRoot
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

/**
 * Metadata associated with a {@link CompartmentDescriptor}.
 *
 * This is intended to include any data we want to associate with a particular
 * `CompartmentDescriptor` when we do want to avoid mutating the descriptor
 * itself.
 *
 * We generally _do not_ want to mutate the compartment descriptors, as
 * `@endo/compartment-mapper` owns these objects.
 */
export interface CompartmentDescriptorData {
  /**
   * The canonical name of the compartment descriptor, computed by the value of
   * {@link CompartmentDescriptor.path}. See `getCanonicalName()`
   */
  canonicalName: CanonicalName
}

/**
 * Map of compartment descriptor locations to metadata
 *
 * The "location" may or may not be a `file://` URL; once the
 * `CompartmentMapDescriptor` has been "digested" (see `digestCompartmentMap()`
 * in `@endo/compartment-mapper`), it becomes name and version string
 * representing the package.
 *
 * If multiple such packages exist in the compartment map, then the "location"
 * will contain a suffix `-<n>` where `<n>` is an incrementing integer starting
 * at 0.
 *
 * For this reason, when used with Endo's `captureFromMap()` (which calls
 * `digestCompartmentMap()`) this object must be recreated using the "renames"
 * data.
 *
 * Note: this map cannot be a `WeakMap` on the `CompartmentDescriptor` itself,
 * as the original `CompartmentDescriptor` (created by `mapNodeModules()`) is
 * not retained through `captureFromMap()`.
 */
export type CompartmentDescriptorDataMap<
  K = string,
  T extends
    Partial<CompartmentDescriptorData> = Partial<CompartmentDescriptorData>,
> = Map<K, T>

/**
 * A mapping of compartment descriptor metadata which is guaranteed to include
 * metadata for all compartment descriptors (excepting the attenuator
 * compartment).
 *
 * @template T The compartment map descriptor
 * @template U The type of the metadata
 */
export type CompleteCompartmentDescriptorDataMap<
  T extends CompartmentMapDescriptor = CompartmentMapDescriptor,
  U extends CompartmentDescriptorData = CompartmentDescriptorData,
> = CompartmentDescriptorDataMap<keyof T['compartments'], U>

/**
 * The canonical name of a package as used in policy
 *
 * {@link ATTENUATORS_COMPARTMENT} does not appear in policy and is an Endo-ism.
 */

export type CanonicalName = LiteralUnion<
  typeof LAVAMOAT_PKG_POLICY_ROOT | typeof ATTENUATORS_COMPARTMENT,
  string
>

/**
 * Options for `compartmentMapToPolicy()`
 */
export type CompartmentMapToPolicyOptions = Simplify<

  BuildModuleRecordsOptions & WithPolicyOverride & WithDebug & WithTrustRoot
>

/**
 * Options containing a `dataMap` property
 *
 * @template K Type of the keys in the data map
 * @template T A potentially-incomplete data map
 */

export type WithDataMap<
  K = string,
  T extends
    Partial<CompartmentDescriptorData> = Partial<CompartmentDescriptorData>,
> = {
  dataMap?: CompartmentDescriptorDataMap<K, T>
}

// re-export schema
// TODO: make this less bad
export type {
  BuiltinPolicy,
  DebugInfo,
  GlobalPolicy,
  GlobalPolicyRead,
  GlobalPolicyValue,
  GlobalPolicyWrite,
  LavaMoatPolicy,
  LavaMoatPolicyDebug,
  PackagePolicy,
  Resolutions,
  ResourcePolicy,
  Resources,
  RootPolicy,
} from 'lavamoat-core'

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

/**
 * A function which "decorates" a {@link CompartmentDescriptor}. It is provided a
 * `data` object, which it can then modify and return.
 *
 * It does not and cannot modify the descriptor itself.
 *
 * @template In Incoming metadata
 * @template Out Outgoing metadata
 */
export type CompartmentDescriptorDecorator<
  In extends
    Partial<CompartmentDescriptorData> = Partial<CompartmentDescriptorData>,
  Out extends In = In,
> = (
  /**
   * The compartment descriptor to decorate; considered readonly
   */
  compartmentDescriptor: Readonly<CompartmentDescriptor>,
  /**
   * The current data associated with `compartmentDescriptor` (if any)
   */
  data?: In,
  /**
   * Options for the decorator, including the entire
   * `CompartmentDescriptorDataMap`
 */
  options?: CompartmentDescriptorDecoratorOptions
) => Out

/**
 * Options for a {@link CompartmentDescriptorDecorator}
 */
export type CompartmentDescriptorDecoratorOptions = Simplify<
  WithTrustRoot & WithLog & WithDataMap
>

/**
 * Options containing a `compartmentDescriptorDecorators` prop
 */
export type WithCompartmentDescriptorDecorators = {
  /**
   * List of decorators which will be applied to each compartment descriptor
   * within the initial compartment map descriptor (via `mapNodeModules()`).
   */
  decorators?: CompartmentDescriptorDecorator[]
}
