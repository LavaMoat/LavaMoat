/**
 * Constants and enums used by this package
 *
 * @remarks
 * This should probably be public and exported from the entry module.
 * @packageDocumentation
 */

/**
 * Names of global properties known to reference `globalThis`
 */
const GLOBAL_THIS_REFS = Object.freeze(
  /** @type {const} */ ({
    WINDOW: 'window',
    SELF: 'self',
    GLOBAL: 'global',
    GLOBAL_THIS: 'globalThis',
    TOP: 'top',
    FRAMES: 'frames',
    PARENT: 'parent',
  })
)

/**
 * Default global properties that reference `globalThis`
 */
const DEFAULT_GLOBAL_THIS_REFS = Object.freeze(Object.values(GLOBAL_THIS_REFS))

/**
 * A global property that is known to reference `globalThis`
 *
 * @typedef {(typeof DEFAULT_GLOBAL_THIS_REFS)[number]} GlobalThisRef
 */

/**
 * Same as `GlobalPolicyWrite` (see schema)
 */
const POLICY_WRITE = 'write'

module.exports = { GLOBAL_THIS_REFS, DEFAULT_GLOBAL_THIS_REFS, POLICY_WRITE }
