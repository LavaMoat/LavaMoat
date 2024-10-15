/**
 * This module should contain constants that are used in multiple places.
 *
 * **All exports in this module are considered part of the public API.**
 *
 * _Type a string more than once? Make it a constant!_
 */
import path from 'node:path'

/**
 * Default policy filename
 */
export const DEFAULT_POLICY_FILENAME = 'policy.json'

/**
 * Default policy override filename
 */
export const DEFAULT_POLICY_OVERRIDE_FILENAME = 'policy-override.json'

/**
 * Default policy debug filename
 */
export const DEFAULT_POLICY_DEBUG_FILENAME = 'policy-debug.json'

/**
 * Relative path to the default policy file
 */
export const DEFAULT_POLICY_PATH = path.normalize(
  `lavamoat/node/${DEFAULT_POLICY_FILENAME}`
)

/**
 * Relative path to the default policy override file
 */
export const DEFAULT_POLICY_OVERRIDE_PATH = path.normalize(
  `lavamoat/node/${DEFAULT_POLICY_OVERRIDE_FILENAME}`
)

/**
 * Relative path to the default policy debug file
 */
export const DEFAULT_POLICY_DEBUG_PATH = path.normalize(
  `lavamoat/node/${DEFAULT_POLICY_DEBUG_FILENAME}`
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
 * The `dynamic` flag on a LavaMoat `ResourcePolicy`
 */
export const LAVAMOAT_RESOURCE_FLAG_DYNAMIC = 'dynamic'

/**
 * The `native` flag on a LavaMoat `ResourcePolicy`
 */
export const LAVAMOAT_RESOURCE_FLAG_NATIVE = 'native'

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
 * Name of the `options` property of a `LavaMoatPackagePolicy`
 */
export const RSRC_POLICY_OPTIONS = 'options'

/**
 * The `native` option on a `LavaMoatPackagePolicy`
 */
export const RSRC_POLICY_OPTION_NATIVE = 'native'

/**
 * `builtin` module type for a `LavamoatModuleRecord`
 */
export const LMR_TYPE_BUILTIN = 'builtin'

/**
 * `js` module type for a `LavamoatModuleRecord`
 */
export const LMR_TYPE_SOURCE = 'js'

/**
 * `native` module type for a `LavamoatModuleRecord`
 */
export const LMR_TYPE_NATIVE = 'native'

/**
 * Name of our custom `native` parser
 *
 * @remarks
 * Used by policy gen
 */
export const NATIVE_PARSER_NAME = 'native'

/**
 * Extension for native modules
 */
export const NATIVE_FILE_EXT = 'node'

/**
 * If we wanted Endo to load and execute the code in attenuators compartment, we
 * could pass `@lavamoat/endomoat/attenuator` as default attenuator and have it
 * loaded statelessly. We're using an impossible specifier to match with an
 * external module instead.
 */
export const DEFAULT_ATTENUATOR = '@attenuator@'
