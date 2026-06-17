/**
 * Programmatic API for `@lavamoat/run`.
 *
 * @remarks
 * Importing this module imports `@lavamoat/node` (via {@link lavax}), which
 * invokes SES `lockdown()`. If you only need the pure helpers (spec parsing,
 * etc.) and want to avoid `lockdown()`, import the relevant submodule
 * directly.
 * @packageDocumentation
 */

export { lavax } from './run.js'
export { splitArgs } from './args.js'
export {
  cacheDirFor,
  computeCacheBase,
  parseSpec,
  slugifySpec,
  unscopedName,
} from './spec.js'
export { buildNpmArgs, installPackage } from './install.js'
export {
  getInstalledPackageName,
  normalizeBin,
  resolveBin,
} from './resolve-bin.js'
export * from './error.js'
export * as constants from './constants.js'
