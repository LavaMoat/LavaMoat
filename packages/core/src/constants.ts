/**
 * Constants and enums used by this package.
 *
 * @packageDocumentation
 */

/**
 * Names of global properties known to reference `globalThis`.
 */
export const GLOBAL_THIS_REFS = Object.freeze({
  WINDOW: 'window',
  SELF: 'self',
  GLOBAL: 'global',
  GLOBAL_THIS: 'globalThis',
  TOP: 'top',
  FRAMES: 'frames',
  PARENT: 'parent',
} as const)

/**
 * Default global properties that reference `globalThis`.
 */
export const DEFAULT_GLOBAL_THIS_REFS = Object.freeze(
  Object.values(GLOBAL_THIS_REFS)
)

/**
 * Same as `GlobalPolicyWrite` (see schema).
 */
export const POLICY_WRITE = 'write'

/**
 * Symbols that look like globals but aren't; indexed by source type.
 */
export const MODULE_REFS = Object.freeze({
  module: ['arguments', 'import', 'export'],
  script: ['arguments', 'require', 'module', 'exports'],
} as const)
