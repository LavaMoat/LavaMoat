/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Internal types used by `@lavamoat/node`.
 *
 * @packageDocumentation
 * @internal
 */

import type {
  CompartmentMapDescriptor,
  ReadNowPowers,
  ReadNowPowersProp,
  Sources,
} from '@endo/compartment-mapper'
import type { LavamoatModuleRecordOptions, LavaMoatPolicy } from 'lavamoat-core'
import type { Except, LiteralUnion, Simplify } from 'type-fest'
import type {
  ATTENUATORS_COMPARTMENT,
  LAVAMOAT_PKG_POLICY_ROOT,
} from './constants.js'
import type {
  BaseLoadCompartmentMapOptions,
  BuildModuleRecordsOptions,
  GeneratePolicyOptions,
  WithCompartmentDescriptorTransforms,
  WithDebug,
  WithFs,
  WithIsBuiltin,
  WithLog,
  WithPolicyOverride,
  WithPolicyOverridePath,
  WithReadFile,
  WithReadPowers,
  WithTrustRoot,
  WritePolicyOptions,
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
export type GenerateOptions = Except<
  GeneratePolicyOptions,
  keyof WritePolicyOptions
>

/**
 * Options for `loadCompartmentMap()`
 *
 * @internal
 */
export type LoadCompartmentMapOptions = Simplify<
  BaseLoadCompartmentMapOptions &
    WithReadPowers &
    WithPolicyOverride &
    WithTrustRoot &
    WithCompartmentDescriptorTransforms
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
> = Simplify<
  WithReadPowers &
    WithIsBuiltin &
    WithLog & {
      /**
       * If set, this implies the associated {@link CompartmentDescriptor} is the
       * entry descriptor.
       */
      rootModule?: RootModule
    }
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
 * @interal
 */
export type ReadPolicyOptions = Simplify<WithReadFile>

/**
 * Options for `readPolicyOverride()`
 *
 * @interal
 */
export type ReadPolicyOverrideOptions = Simplify<WithReadFile>

/**
 * Options for `resolveBinScript()`
 *
 * @interal
 */
export type ResolveBinScriptOptions = Simplify<WithFs & WithFrom>

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
export type ResolveEntrypointOptions = Simplify<WithFrom>

/**
 * Options for `resolveWorkspace()`
 *
 * @interal
 */
export type ResolveWorkspaceOptions = ResolveBinScriptOptions

/**
 * Options for `inspectModuleRecords()`
 *
 * @interal
 */
export type InspectModuleRecordsOptions = Simplify<
  WithLog & WithDebug & WithTrustRoot
>

/**
 * Possible options for creating a `LavamoatModuleRecord` within the context of
 * this package.
 *
 * - `moduleInitializer` is only used by the `lavamoat-core` kernel;
 *   `@endo/compartment-mapper`'s parsers handle this for us
 * - `ast` is created internally by the module inspector and we needn't provide it
 *
 * @interal
 */
export type SimpleLavamoatModuleRecordOptions = Omit<
  // eslint-disable-next-line @typescript-eslint/ban-types
  LavamoatModuleRecordOptions,
  'ast' | 'moduleInitializer'
>

/**
 * The canonical name of a package as used in policy
 *
 * {@link ATTENUATORS_COMPARTMENT} does not appear in policy and is an Endo-ism.
 *
 * @interal
 */
export type CanonicalName = LiteralUnion<
  typeof LAVAMOAT_PKG_POLICY_ROOT | typeof ATTENUATORS_COMPARTMENT,
  string
>

/**
 * N array of required properties for {@link ReadNowPowers}
 *
 * @interal
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
 * @interal
 */
export type ReportInvalidOverridesOptions = Simplify<
  WithPolicyOverride & WithPolicyOverridePath & WithLog
>

/**
 * Result of `generatePolicy()`
 *
 * @interal
 */
export type GenerateResult<T extends LavaMoatPolicy = LavaMoatPolicy> = {
  policy: T
  compartmentMap: CompartmentMapDescriptor
}

/**
 * Options for `compartmentMapToPolicy()`
 *
 * @interal
 */
export type CompartmentMapToPolicyOptions = Simplify<
  BuildModuleRecordsOptions & WithPolicyOverride & WithDebug & WithTrustRoot
>

/**
 * Result of `loadCompartmentMap()`
 *
 * @internal
 */
export interface LoadCompartmentMapResult {
  /**
   * The final compartment map descriptor, having been run through
   * `captureFromMap()`.
   */
  compartmentMap: CompartmentMapDescriptor
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
export type MakeGlobalsAttenuatorOptions = Simplify<
  WithPolicy & WithScuttleGlobalThis
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
