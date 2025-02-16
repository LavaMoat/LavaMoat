const DEFAULT_GLOBAL_THIS_REFS = Object.freeze(/** @type {readonly string[]} */(Object.values({
  WINDOW: 'window',
  SELF: 'self',
  GLOBAL: 'global',
  GLOBAL_THIS: 'globalThis',
  TOP: 'top',
  FRAMES: 'frames',
  PARENT: 'parent',
})));

module.exports = {DEFAULT_GLOBAL_THIS_REFS}
