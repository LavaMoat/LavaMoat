/**
 * This module should contain constants that are used in multiple places.
 *
 * _Type a string more than once? Make it a constant!_
 */
import path from 'node:path'

/**
 * Relative path to the default policy file
 */
export const DEFAULT_POLICY_PATH = path.normalize('lavamoat/node/policy.json')

/**
 * Relative path to the default policy override file
 */
export const DEFAULT_POLICY_OVERRIDE_PATH = path.normalize(
  'lavamoat/node/policy-override.json'
)

export const DEFAULT_POLICY_DEBUG_PATH = path.normalize(
  'lavamoat/node/policy-debug.json'
)

/**
 * Policy item for the root entry
 */
export const POLICY_ITEM_ROOT = 'root'

/**
 * Policy item for a writable global
 */
export const POLICY_ITEM_WRITE = 'write'

/**
 * Policy item for any access
 */
export const POLICY_ITEM_WILDCARD = 'any'

/**
 * Designator for the root policy item in a LavaMoat policy
 */
export const LAVAMOAT_PKG_POLICY_ROOT = '$root$'

/**
 * Name of the `packages` property of a `LavaMoatPackagePolicy`
 */
export const RSRC_POLICY_PKGS = 'packages'

/**
 * Name of the `builtins` property of a `LavaMoatPackagePolicy`
 */
export const RSRC_POLICY_BUILTINS = 'builtins'

/**
 * Name of the `globals` property of a `LavaMoatPackagePolicy`
 */
export const RSRC_POLICY_GLOBALS = 'globals'

/**
 * `builtin` module type for a `LavamoatModuleRecord`
 */
export const LMR_TYPE_BUILTIN = 'builtin'

/**
 * `js` module type for a `LavamoatModuleRecord`
 */
export const LMR_TYPE_SOURCE = 'js'
