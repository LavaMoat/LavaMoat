/**
 * Package-spec parsing and cache-directory computation.
 *
 * These functions are pure (modulo {@link computeCacheBase}'s use of the
 * environment and home directory) and contain no `@lavamoat/node` dependency,
 * so they can be unit-tested without triggering SES `lockdown()`.
 *
 * **All exports in this module are considered part of the public API.**
 *
 * @packageDocumentation
 */

import { createHash } from 'node:crypto'
import os from 'node:os'
import path from 'node:path'
import { CACHE_DIR_ENV_VAR, DEFAULT_CACHE_SUBDIR } from './constants.js'
import { SpecParseError } from './error.js'

/**
 * @import {ParsedSpec} from './types.js'
 */

/**
 * Matches specs that are not "registry" specs (URLs, git specifiers, file
 * paths). For these, the package name cannot be reliably derived from the spec
 * string and must instead be read from the installed `package.json`.
 */
const NON_REGISTRY_SPEC_REGEXP =
  /^(?:[./~]|[a-z]+:\/\/|git\+|git@|file:|npm:|github:|[^/]+\/[^/]+(?:#.*)?$)/i

/**
 * Parses an npm package spec into its name (when determinable) and version
 * range.
 *
 * Handles the common registry forms:
 *
 * - `pkg`
 * - `pkg@1.2.3`
 * - `pkg@^1`
 * - `pkg@latest`
 * - `@scope/pkg`
 * - `@scope/pkg@1.2.3`
 *
 * For non-registry specs (tarball URLs, git specifiers, local paths) the `name`
 * is `undefined`; callers should reconcile it against the installed
 * `package.json` after installation.
 *
 * @param {string} rawSpec Raw package spec
 * @returns {ParsedSpec}
 */
export const parseSpec = (rawSpec) => {
  if (typeof rawSpec !== 'string') {
    throw new SpecParseError(`Package spec must be a string`)
  }
  const raw = rawSpec.trim()
  if (!raw) {
    throw new SpecParseError(`Package spec must not be empty`)
  }
  // A spec beginning with `-` would be interpreted by `npm` as a flag rather
  // than a package name. Reject it outright so it can never be smuggled into
  // the install step (e.g. via the programmatic API), independent of the `--`
  // guard in buildNpmArgs.
  if (raw.startsWith('-')) {
    throw new SpecParseError(
      `Package spec must not start with "-": "${raw}"`
    )
  }

  // Scoped registry specs always begin with `@scope/`. Handle them before the
  // non-registry heuristic, which would otherwise mistake `@scope/pkg` for a
  // `user/repo` GitHub shorthand.
  if (raw.startsWith('@')) {
    const slash = raw.indexOf('/')
    if (slash === -1) {
      // e.g. `@foo` — not a valid package name, but don't choke
      return { name: raw, version: undefined, raw }
    }
    const at = raw.indexOf('@', slash)
    if (at === -1) {
      return { name: raw, version: undefined, raw }
    }
    return { name: raw.slice(0, at), version: raw.slice(at + 1), raw }
  }

  if (NON_REGISTRY_SPEC_REGEXP.test(raw)) {
    return { name: undefined, version: undefined, raw }
  }

  const at = raw.indexOf('@')
  if (at <= 0) {
    return { name: raw, version: undefined, raw }
  }
  return { name: raw.slice(0, at), version: raw.slice(at + 1), raw }
}

/**
 * Returns the unscoped portion of a package name (`@scope/foo` → `foo`).
 *
 * @param {string} name Package name
 * @returns {string}
 */
export const unscopedName = (name) =>
  name.startsWith('@') && name.includes('/')
    ? /** @type {string} */ (name.split('/')[1])
    : name

/**
 * Turns an arbitrary spec into a filesystem-safe slug.
 *
 * @param {string} raw Raw spec
 * @returns {string}
 */
export const slugifySpec = (raw) => {
  const slug = raw
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 64)
  return slug || 'pkg'
}

/**
 * Computes the base directory under which per-spec sandboxes are created.
 *
 * Precedence: explicit `cacheDir` option, then the `LAVAMOAT_RUN_CACHE`
 * environment variable, then `~/.lavamoat/run`.
 *
 * @param {{
 *   cacheDir?: string
 *   env?: NodeJS.ProcessEnv
 *   homedir?: () => string
 * }} [options]
 *   Options
 * @returns {string}
 */
export const computeCacheBase = ({
  cacheDir,
  env = process.env,
  homedir = os.homedir,
} = {}) => {
  if (cacheDir) {
    return path.resolve(cacheDir)
  }
  const fromEnv = env[CACHE_DIR_ENV_VAR]
  if (fromEnv) {
    return path.resolve(fromEnv)
  }
  return path.join(homedir(), ...DEFAULT_CACHE_SUBDIR)
}

/**
 * Computes the sandbox directory for a given spec under `base`.
 *
 * The directory name combines a human-readable slug with a short hash of the
 * raw spec, so distinct specs (e.g. `cowsay@1` vs `cowsay@2`) never collide,
 * yet repeated invocations of the same spec reuse the same sandbox.
 *
 * @param {string} raw Raw spec
 * @param {string} base Base directory (see {@link computeCacheBase})
 * @returns {string} Absolute path to the sandbox directory
 */
export const cacheDirFor = (raw, base) => {
  const hash = createHash('sha256').update(raw).digest('hex').slice(0, 12)
  return path.join(base, `${slugifySpec(raw)}-${hash}`)
}
