/**
 * Shared type definitions for `@lavamoat/run`.
 *
 * This module has no runtime exports; it exists to host JSDoc `@typedef`s
 * consumed elsewhere via `@import`.
 *
 * @packageDocumentation
 */

export {}

/**
 * A parsed package spec.
 *
 * @typedef ParsedSpec
 * @property {string | undefined} name Package name, if determinable from the
 *   spec alone
 * @property {string | undefined} version Version range / dist-tag, if present
 * @property {string} raw The original (trimmed) spec
 */

/**
 * Options for {@link import('./install.js').installPackage}.
 *
 * @typedef InstallOptions
 * @property {string} cwd Sandbox directory to install into
 * @property {boolean} [allowScripts] Allow lifecycle (install) scripts to run.
 *   Defaults to `false` — the core LavaMoat protection.
 * @property {string} [registry] Npm registry URL override
 * @property {boolean} [quiet] Suppress npm's own output
 * @property {typeof import('node:child_process').spawn} [spawn] Injectable
 *   `spawn` implementation (for testing)
 */

/**
 * The result of resolving a package's bin script.
 *
 * @typedef ResolvedBin
 * @property {string} packageName Canonical installed package name
 * @property {string} binName Selected bin name
 * @property {string} binPath Absolute path to the bin script
 */

/**
 * Options for {@link import('./run.js').lavax}.
 *
 * @typedef LavaxOptions
 * @property {string} [call] Explicit bin name to run (overrides the default)
 * @property {boolean} [regenerate] Force regeneration of the policy
 * @property {boolean} [force] Reinstall even if a cached install exists
 * @property {boolean} [allowScripts] Allow lifecycle (install) scripts to run
 *   (dangerous; defaults to `false`)
 * @property {boolean} [prodOnly] Exclude dev dependencies / use production
 *   conditions. Defaults to `true`.
 * @property {string} [registry] Npm registry URL override
 * @property {string} [cacheDir] Override the cache base directory
 * @property {string} [policyPath] Override the policy file path
 * @property {boolean} [quiet] Suppress npm's own output during install
 * @property {(spec: string, options: InstallOptions) => Promise<void>} [install]
 *   Injectable installer (for testing)
 * @property {typeof import('@lavamoat/node').run} [run] Injectable runner (for
 *   testing)
 * @property {typeof import('@lavamoat/node').generatePolicy} [generatePolicy]
 *   Injectable policy generator (for testing)
 */
