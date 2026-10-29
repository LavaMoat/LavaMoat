/**
 * Types for authors of LavaMoat Capability Files.
 *
 * A Capability File is evaluated in an isolated Compartment that provides
 * `repair` and `defineCapability` as globals. Import these types in your
 * capability file's JSDoc to get editor support for those globals.
 *
 * @example
 *
 * ```js
 * /** @import { Repair, DefineCapability } from '@lavamoat/types/capability' *\/
 * ```
 */

/** Parameters passed to an {@link EndowCallback}. */
export interface EndowParams {
  /** Options array from the resource's `capabilities` policy entry. */
  options: unknown[]
  /** Proposed endowments object built by `getEndowmentsForConfig`. */
  endowments: Record<string, unknown>
  /** The compartment's `globalThis`. */
  compartmentGlobalThis: object
  /**
   * The root compartment's `globalThis`. Equals `compartmentGlobalThis` for the
   * root package.
   */
  rootCompartmentGlobalThis: object
}

/** The `endow` callback registered inside a `defineCapability` call. */
export type EndowCallback = (params: EndowParams) => void

/**
 * The definition object passed as the second argument to
 * {@link DefineCapability}.
 */
export interface CapabilityDefinition {
  /**
   * When `true`, applied to every compartment automatically without needing a
   * `capabilities` entry.
   */
  ambient: boolean
  endow: EndowCallback
}

/**
 * The `repair` global available inside a Capability File.
 *
 * Registers a callback to run after `repairIntrinsics()` but before
 * `hardenIntrinsics()`. The callback receives the real top-level `globalThis`
 * and may modify it. Capturing `realGlobalThis` in a higher scope for use
 * inside `endow` is safe and expected.
 */
export type Repair = (callback: (realGlobalThis: object) => void) => void

/**
 * The `defineCapability` global available inside a Capability File.
 *
 * Registers a named capability. A single file may call `defineCapability`
 * multiple times with different names. The `name` must match a name declared in
 * the corresponding Capability Module.
 */
export type DefineCapability = (
  name: string,
  definition: CapabilityDefinition
) => void
