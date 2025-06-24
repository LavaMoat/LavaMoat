/**
 * This module should contain constants that are used in multiple places.
 *
 * **All exports in this module are considered part of the public API.**
 *
 * _Type a string more than once? Make it a constant!_
 */
import path from 'node:path'

const { freeze } = Object

/**
 * Const string to identify the internal attenuators compartment
 *
 * Copied from `@endo/compartment-mapper`
 *
 * @privateRemarks
 * TODO: Export from `@endo/compartment-mapper`
 */
export const ATTENUATORS_COMPARTMENT = '<ATTENUATORS>'

/**
 * Specifier of the default attenuator
 *
 * If we wanted Endo to load and execute the code in attenuators compartment, we
 * could pass `@lavamoat/endomoat/attenuator` as default attenuator and have it
 * loaded statelessly. We're using an impossible specifier to match with an
 * external module instead.
 */
export const DEFAULT_ATTENUATOR = '@attenuator@'

/**
 * Default policy debug filename
 */
export const DEFAULT_POLICY_DEBUG_FILENAME = 'policy-debug.json'

/**
 * Relative path to the default policy debug file
 */
export const DEFAULT_POLICY_DEBUG_PATH = path.normalize(
  `lavamoat/node/${DEFAULT_POLICY_DEBUG_FILENAME}`
)

/**
 * Default policy filename
 */
export const DEFAULT_POLICY_FILENAME = 'policy.json'

export const DEFAULT_POLICY_DIR = path.normalize('lavamoat/node')

/**
 * Relative path to the default policy file
 */
export const DEFAULT_POLICY_PATH = path.normalize(
  `lavamoat/node/${DEFAULT_POLICY_FILENAME}`
)

/**
 * Default policy override filename
 */
export const DEFAULT_POLICY_OVERRIDE_FILENAME = 'policy-override.json'

/**
 * Relative path to the default policy override file
 */
export const DEFAULT_POLICY_OVERRIDE_PATH = path.normalize(
  `lavamoat/node/${DEFAULT_POLICY_OVERRIDE_FILENAME}`
)

/**
 * When passed into the attenuator, writable globals have this policy item
 */
export const ENDO_GLOBAL_POLICY_ITEM_WRITE = 'write'

/**
 * The `attenuate` prop of an Endo policy
 */
export const ENDO_POLICY_ITEM_ATTENUATE = 'attenuate'

/**
 * Policy item for the root entry
 */
export const ENDO_POLICY_ITEM_ROOT = 'root'

/**
 * Policy item for any access
 */
export const ENDO_POLICY_ITEM_WILDCARD = 'any'

/**
 * The `params` prop of an Endo policy
 */
export const ENDO_POLICY_ITEM_PARAMS = 'params'

/**
 * The `defaultAttenuator` prop of an Endo policy
 */
export const ENDO_POLICY_DEFAULT_ATTENUATOR = 'defaultAttenuator'

/**
 * The `entry` prop of an Endo policy
 */
export const ENDO_POLICY_ENTRY = 'entry'

/**
 * The `resources` prop of an Endo policy
 */
export const ENDO_POLICY_RESOURCES = 'resources'

/**
 * The `noGlobalFreeze` prop of an Endo packge policy
 */
export const ENDO_PKG_POLICY_NO_GLOBAL_FREEZE = 'noGlobalFreeze'

/**
 * Name of the `builtins` property of a `LavaMoatPackagePolicy`
 */
export const ENDO_PKG_POLICY_BUILTINS = 'builtins'

/**
 * Name of the `globals` property of a `LavaMoatPackagePolicy`
 */
export const ENDO_PKG_POLICY_GLOBALS = 'globals'

/**
 * The `native` option on a `LavaMoatPackagePolicy`
 */
export const ENDO_PKG_POLICY_OPTION_NATIVE = 'native'

/**
 * Name of the `options` property of a `LavaMoatPackagePolicy`
 */
export const ENDO_PKG_POLICY_OPTIONS = 'options'

/**
 * Name of the `packages` property of a `LavaMoatPackagePolicy`
 */
export const ENDO_PKG_POLICY_PACKAGES = 'packages'

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
 * Flag for root policy item in a LavaMoat policy
 */
export const LAVAMOAT_PKG_POLICY_ROOT = '$root$'

/**
 * The `native` flag on a LavaMoat `ResourcePolicy`
 */
export const LAVAMOAT_PKG_POLICY_NATIVE = 'native'

/**
 * Policy item for a writable global
 */
export const LAVAMOAT_POLICY_ITEM_WRITE = 'write'

/**
 * Extension for native modules
 */
export const NATIVE_PARSER_FILE_EXT = 'node'

/**
 * Name of our custom `native` parser
 *
 * @remarks
 * Used by policy gen
 */
export const NATIVE_PARSER_NAME = 'native'

/**
 * Whether we should trust the root compartment _by default_
 */
export const DEFAULT_TRUST_ROOT_COMPARTMENT = true

/**
 * The `package.json` filename, naturally
 */
export const PACKAGE_JSON = 'package.json'

export const GLOBAL_THIS_REFS = freeze(
  /** @type {const} */ (['global', 'globalThis'])
)

/**
 * The variations of SES compatibility problems
 */
export const SES_VIOLATION_TYPES = freeze(
  /** @type {const} */ ({
    DynamicRequires: 'dynamic requires',
    PrimordialMutation: 'primordial mutation',
    StrictModeViolation: 'strict-mode violation',
  })
)

export const MERGED_POLICY_FIELD = Symbol.for('@lavamoat/core/mergedPolicy')
