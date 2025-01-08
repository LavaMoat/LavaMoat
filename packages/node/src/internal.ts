/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Internal types used by `@lavamoat/node`.
 *
 * @packageDocumentation
 */

import {
  GeneratePolicyOptions,
  WithDebug,
  WithDev,
  WithIsBuiltin,
  WithLog,
  WithPolicyOverride,
  WithReadPowers,
  WritePolicyOptions,
} from '#types'
import type {
  CaptureLiteOptions,
  MapNodeModulesOptions,
} from '@endo/compartment-mapper'
import { Merge, type Except } from 'type-fest'

/**
 * Options to pass-through to Endo.
 *
 * Used by {@link GeneratePolicyOptions}.
 *
 * The {@link CaptureLiteOptions.dev dev} property defaults to `true`.
 *
 * @remarks
 * Omitted properties cannot by overridden by the user.
 * @internal
 */
export type BaseLoadCompartmentMapOptions = Merge<
  Except<CaptureLiteOptions, 'importHook' | 'moduleTransforms'>,
  Merge<WithLog, WithDev>
>

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
  keyof WritePolicyOptions | 'isAbsolute'
>

/**
 * Options for `loadCompartmentMap()`
 *
 * @internal
 */
export type LoadCompartmentMapOptions = Merge<
  Merge<
    Omit<BaseLoadCompartmentMapOptions, 'dev'>,
    Pick<MapNodeModulesOptions, 'conditions'>
  >,
  Merge<WithReadPowers, WithPolicyOverride>
>

/**
 * Mapping of compartment name to missing module names
 *
 * @internal
 * @see {@link PolicyGeneratorContextOptions.missingModules}
 */
export type MissingModuleMap = Map<string, Set<string>>

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
