/**
 * Constants shared across `@lavamoat/run`.
 *
 * **All exports in this module are considered part of the public API.**
 *
 * @packageDocumentation
 */

/**
 * The `package.json` filename.
 */
export const PACKAGE_JSON = 'package.json'

/**
 * Environment variable used to override the cache directory base.
 */
export const CACHE_DIR_ENV_VAR = 'LAVAMOAT_RUN_CACHE'

/**
 * Name of the synthetic `package.json` `name` field written into each sandbox
 * directory.
 *
 * @remarks
 * The sandbox is a throwaway "project" into which a single package is
 * installed; it exists only to give `npm` and `@endo/compartment-mapper` a
 * well-formed root to work from.
 */
export const SANDBOX_PACKAGE_NAME = '@lavamoat/run-sandbox'

/**
 * Filename of the marker file written to a sandbox directory after a successful
 * install. Its contents are the raw package spec that was installed.
 */
export const INSTALL_MARKER_FILENAME = '.lavamoat-run-installed'

/**
 * Default subdirectory (relative to the user's home directory) used as the
 * cache base when {@link CACHE_DIR_ENV_VAR} is unset.
 */
export const DEFAULT_CACHE_SUBDIR = ['.lavamoat', 'run']

/**
 * Relative path (within a sandbox directory) at which the generated policy is
 * stored. Mirrors `@lavamoat/node`'s default policy location.
 */
export const POLICY_RELATIVE_PATH = ['lavamoat', 'node', 'policy.json']

/**
 * `@lavamoat/run` treats every fetched package as untrusted; the root
 * compartment is therefore never trusted.
 */
export const TRUST_ROOT = false
