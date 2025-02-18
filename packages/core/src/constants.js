const GLOBAL_THIS_REFS = Object.freeze(/** @type {const} */({
  WINDOW: 'window',
  SELF: 'self',
  GLOBAL: 'global',
  GLOBAL_THIS: 'globalThis',
  TOP: 'top',
  FRAMES: 'frames',
  PARENT: 'parent',
}))

const DEFAULT_GLOBAL_THIS_REFS = Object.freeze(Object.values(GLOBAL_THIS_REFS))

/**
 * @typedef {typeof DEFAULT_GLOBAL_THIS_REFS[number]} GlobalThisRef
 */


module.exports = {GLOBAL_THIS_REFS, DEFAULT_GLOBAL_THIS_REFS}

module.exports = {DEFAULT_GLOBAL_THIS_REFS}
