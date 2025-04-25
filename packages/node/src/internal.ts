/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Internal types used by `@lavamoat/node`.
 *
 * @packageDocumentation
 * @internal
 */

import type {
  AdditionalPackageDetailsMap,
  CompartmentDescriptor,
  CompartmentMapDescriptor,
  ReadNowPowers,
  ReadNowPowersProp,
  Sources,
} from '@endo/compartment-mapper'
import type {
  LavamoatModuleRecordOptions,
  LavaMoatPolicy,
  Resources,
} from 'lavamoat-core'
import type { SetFieldType, ValueOf } from 'type-fest'
import type { SES_VIOLATION_TYPES } from './constants.js'
import type {
  CompartmentDescriptorDecoratorOptions,
  CompleteCompartmentDescriptorDataMap,
  ComposeOptions,
  GeneratePolicyOptions,
  WithCaptureLiteOptions,
  WithCompartmentDescriptorDecorators,
  WithDebug,
  WithDev,
  WithFs,
  WithIsBuiltin,
  WithLog,
  WithPolicyOverride,
  WithPolicyOverrideOnly,
  WithPolicyOverridePath,
  WithProjectRoot,
  WithReadFile,
  WithReadPowers,
  WithScuttleGlobalThis,
  WithTrustRoot,
  WithWritePolicyOptions,
} from './types.js'

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

/**
 * Options for `generate()` function
 *
 * @internal
 */
export type GenerateOptions = Omit<
  GeneratePolicyOptions,
  keyof WithWritePolicyOptions
>

/**
 * Options for `loadCompartmentMapForPolicy()`
 *
 * @internal
 */
export type LoadCompartmentMapForPolicyOptions = ComposeOptions<
  [
    WithCaptureLiteOptions,
    WithReadPowers,
    WithPolicyOverride,
    WithTrustRoot,
    WithCompartmentDescriptorDecorators,
    WithProjectRoot,
  ]
>

/**
 * Options for the `PolicyGeneratorContext` constructor
 *
 * @template RootModule If a `string`, then this is the name of the root module,
 *   which lives in the root compartment. We can use this to distinguish
 *   `PolicyGeneratorContext` instances in which the associated compartment is
 *   _not_ the entry compartment (if needed). Generally, this can be ignored.
 * @internal
 */
export type PolicyGeneratorContextOptions<
  RootModule extends string | void = void,
> = ComposeOptions<
  [
    WithReadPowers,
    WithIsBuiltin,
    WithLog,
    {
      /**
       * If set, this implies the associated {@link CompartmentDescriptor} is the
       * entry descriptor.
       */
      rootModule?: RootModule
    },
  ]
>

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
 * A `globalThis` object with unknown properties.
 *
 * This is basically just an object with anything in it, since we cannot be sure
 * that any given global property is present (or what its type is) in the
 * current compartment at any given time.
 *
 * @internal
 */
export type SomeGlobalThis = Record<PropertyKey, unknown>

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
 * Options for `readPolicy()`
 *
 * @internal
 */
export type ReadPolicyOptions = ComposeOptions<[WithReadFile]>

/**
 * Options for `readPolicyOverride()`
 *
 * @internal
 */
export type ReadPolicyOverrideOptions = ComposeOptions<[WithReadFile]>

/**
 * Options for `resolveBinScript()`
 *
 * @internal
 */
export type ResolveBinScriptOptions = ComposeOptions<[WithFs, WithFrom]>

/**
 * Options containing a `from` property; used for path resolution
 *
 * @internal
 */
export interface WithFrom {
  /**
   * Where to resolve from
   */
  from?: string | URL
}

/**
 * Options for `resolveEntrypoint()`
 */
export type ResolveEntrypointOptions = ComposeOptions<[WithFrom]>

/**
 * Options for `resolveWorkspace()`
 *
 * @internal
 */
export type ResolveWorkspaceOptions = ResolveBinScriptOptions

/**
 * Options for `inspectModuleRecords()`
 *
 * @internal
 */
export type ModuleRecordsToPolicyOptions = ComposeOptions<
  [WithLog, WithDebug, WithTrustRoot, WithPolicyOverride, WithIsBuiltin]
>

/**
 * Options for `inspectModuleRecords()` with `debug` set to `true`
 *
 * @internal
 */
export type ModuleRecordsToDebugPolicyOptions = SetFieldType<
  ModuleRecordsToPolicyOptions,
  'debug',
  true
>

/**
 * Possible options for creating a `LavamoatModuleRecord` within the context of
 * this package.
 *
 * - `moduleInitializer` is only used by the `lavamoat-core` kernel;
 *   `@endo/compartment-mapper`'s parsers handle this for us
 * - `ast` is created internally by the module inspector and we needn't provide it
 */
export type SimpleLavamoatModuleRecordOptions = Omit<
  // eslint-disable-next-line @typescript-eslint/ban-types
  LavamoatModuleRecordOptions,
  'ast' | 'moduleInitializer'
>

/**
 * N array of required properties for {@link ReadNowPowers}
 *
 * @internal
 */
export type RequiredReadNowPowers = ReadonlyArray<
  {
    // eslint-disable-next-line @typescript-eslint/ban-types
    [K in ReadNowPowersProp]-?: {} extends Pick<ReadNowPowers, K> ? never : K
  }[ReadNowPowersProp]
>

/**
 * Options for `reportInvalidOverrides()`
 *
 * @internal
 */
export type ReportInvalidOverridesOptions = ComposeOptions<
  [WithPolicyOverride, WithPolicyOverridePath, WithLog]
>

/**
 * Result of `generatePolicy()`
 *
 * @internal
 */
export type GenerateResult<
  T extends LavaMoatPolicy = LavaMoatPolicy,
  U extends CompartmentMapDescriptor = CompartmentMapDescriptor,
> = {
  policy: T
  compartmentMap: U
  dataMap: CompleteCompartmentDescriptorDataMap<U>
}

/**
 * Result of `loadCompartmentMap()`
 *
 * @internal
 */
export interface LoadCompartmentMapResult<
  T extends CompartmentMapDescriptor = CompartmentMapDescriptor,
> {
  /**
   * The final compartment map descriptor, having been run through
   * `captureFromMap()`.
   */
  compartmentMap: T
  /**
   * The final mapping of compartment name to `CompartmentSources`, having been
   * run through `captureFromMap()`
   */
  sources: Sources
  /**
   * Mapping of original compartment names (from `mapNodeModules()`) to
   * normalized compartment names (from `captureFromMap()`)
   */
  renames: Record<string, string>

  dataMap: CompleteCompartmentDescriptorDataMap<T>
}

/**
 * Options for `makeNodeCompartmentMap()`
 *
 * @internal
 */
export type MakeNodeCompartmentMapOptions = ComposeOptions<
  [
    WithLog,
    WithCompartmentDescriptorDecorators,
    WithReadPowers,
    WithDev,
    WithTrustRoot,
    WithPolicy,
    WithPolicyOverrideOnly,
    WithProjectRoot,
  ]
>

/**
 * Options for `decorateCompartmentMap()`
 *
 * @internal
 */
export type DecorateCompartmentMapOptions =
  CompartmentDescriptorDecoratorOptions

/**
 * Result of `makeNodeCompartmentMap()`
 *
 * @internal
 */
export type MakeNodeCompartmentMapResult<
  T extends CompartmentMapDescriptor = CompartmentMapDescriptor,
> = {
  /**
   * Denormalized compartment map descriptor having Endo-style URLs for
   * `CompartmentDescriptor` names and rough `ModuleDescriptor`s. May contain
   * more `CompartmentDescriptor`s than will actually be used.
   */
  nodeCompartmentMap: CompartmentMapDescriptor
  /**
   * Extra metadata about the `CompartmentMapDescriptor`
   */
  nodeDataMap: CompleteCompartmentDescriptorDataMap<T>
  /**
   * Details for "hints" to provide to `captureFromMap()`
   *
   * Will be an empty object if no `PolicyHints` appear in policy overrides
   */
  additionalPackageDetails: AdditionalPackageDetailsMap
}

/**
 * Proper names of SES violation types
 *
 * @internal
 */
export type SesViolationType = ValueOf<typeof SES_VIOLATION_TYPES>

/**
 * Options for `makeGlobalsAttenuator()`
 *
 * @internal
 */
export type MakeGlobalsAttenuatorOptions = ComposeOptions<
  [WithPolicy, WithScuttleGlobalThis]
>

/**
 * Options containing a `policy` prop
 *
 * @template T The type of the resources in the policy
 * @internal
 */
export interface WithPolicy<T extends Resources = Resources> {
  policy?: LavaMoatPolicy<T>
}

/**
 * A function which attempts to get a related comaprtment descriptor by name
 * (from a given compartment descriptor).
 *
 * @internal
 */
export type GetValidCompartmentDescriptorFn = (
  currentCompartmentDescriptor: CompartmentDescriptor,
  compartmentName: string
) => CompartmentDescriptor | undefined

/**
 * Options for `makePolicyGenCompartment()`
 *
 * @internal
 */
export type MakePolicyGenCompartmentOptions = ComposeOptions<
  [WithPolicyOverrideOnly, WithLog]
>

/**
 * Options for `makeGetHints()`
 *
 * @internal
 */
export type MakeGetHintsOptions = ComposeOptions<
  [WithPolicyOverrideOnly, WithLog]
>

/**
 * Options for `buildModuleRecords()`
 *
 * @remarks
 * Exported due to use within {@link CompartmentMapToPolicyOptions}
 */

export type BuildModuleRecordsOptions = ComposeOptions<
  [WithReadPowers, WithIsBuiltin, WithLog]
>

/**
 * Options for `compartmentMapToPolicy()`
 */
export type CompartmentMapToPolicyOptions = ComposeOptions<
  [BuildModuleRecordsOptions, WithPolicyOverride, WithDebug, WithTrustRoot]
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
