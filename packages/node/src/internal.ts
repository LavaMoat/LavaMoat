/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Internal types used by `@lavamoat/node`.
 *
 * @packageDocumentation
 * @internal
 */

import type { MapNodeModulesOptions } from '@endo/compartment-mapper'
import type nodeFs from 'node:fs'
import { PathLike, Stats } from 'node:fs'
import type { Except, Merge } from 'type-fest'
import type {
  BaseLoadCompartmentMapOptions,
  GeneratePolicyOptions,
  WithIsBuiltin,
  WithLog,
  WithPolicyOverride,
  WithReadPowers,
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
    readFile: (path: PathLike) => Promise<string | Buffer>
  }
  realpathSync: (path: PathLike, encoding?: BufferEncoding) => Buffer | string
}

/**
 * Options bucket containing an `fs` prop.
 */
export interface WithFs {
  fs?: FsUtilInterface
}

export type ResolveBinScriptOptions = Merge<
  WithFs,
  {
    /**
     * Directory to begin looking for the script in
     */
    from?: string
  }
>

export type ResolveWorkspaceOptions = ResolveBinScriptOptions
