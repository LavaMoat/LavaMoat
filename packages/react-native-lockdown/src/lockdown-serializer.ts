/**
 * Types for `lockdownSerializer()`
 *
 * @packageDocumentation
 */

/**
 * Input serializer configuration for `lockdownSerializer()`.
 *
 * @privateRemarks
 * This should be the same type as `metro-config`'s `SerializerConfigT`; we only
 * need a tiny slice of types from `metro-config` and it is not worth it to add
 * as a production dependency.
 * @see {@link https://github.com/facebook/metro/blob/main/packages/metro-config/types/configTypes.d.ts}
 */
export interface LockdownSerializerConfig {
  getPolyfills?: GetPolyfillsFn

  getRunModuleStatement?: GetRunModuleStatementFn

  [key: PropertyKey]: unknown
}

/**
 * Options for `lockdownSerializer()`
 */
export interface LockdownSerializerOptions {
  /**
   * Whether to enable Hermes runtime support (otherwise JavaScript Core).
   * Default is `true`
   */
  hermesRuntime?: boolean
}

/**
 * Result of calling `lockdownSerializer()`.
 *
 * This will not be the same object as the provided
 * {@link LockdownSerializerConfig}.
 */
export type LockedDownSerializerConfig = Omit<
  LockdownSerializerConfig,
  'getRunModuleStatement' | 'getPolyfills'
> & {
  getRunModuleStatement: GetRunModuleStatementFn
  getPolyfills: GetPolyfillsFn
}

/**
 * @see {@link https://metrobundler.dev/docs/configuration/#getrunmodulestatement}
 */
export type GetRunModuleStatementFn = (moduleId: number | string) => string

/**
 * @see {@link https://metrobundler.dev/docs/configuration/#getpolyfills}
 */
export type GetPolyfillsFn = (options: {
  platform: string | null
}) => ReadonlyArray<string>
