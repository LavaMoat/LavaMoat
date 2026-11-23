// @ts-check
/**
 * Utility to derive a LavaMoat package name from a resolved module path.
 *
 * Uses `module.findPackageJSON` (available since Node 20.11) to locate the
 * nearest `package.json` and read its `name` field, which is more robust than
 * splitting on path separators (handles scoped packages, monorepo hoisting,
 * etc. without special-casing).
 *
 * Extracted into its own file so it can be imported in tests without needing
 * SES / `lockdown()` to have been called first.
 *
 * @module
 */
'use strict'

const fs = require('node:fs')
const path = require('node:path')

// eslint-disable-next-line n/no-unsupported-features/node-builtins
const { findPackageJSON } = require('node:module')
const { pathToFileURL } = require('node:url')

/** @type {Map<string, string>} Cache From package.json path → package name */
const cache = new Map()

/**
 * Determine the LavaMoat package name for a resolved absolute path.
 *
 * - Paths whose nearest `package.json` lives inside a `node_modules` directory →
 *   the `name` field of that `package.json`
 * - Everything else (root project files) → `'$root$'`
 *
 * @param {string} resolvedPath Absolute path to the module file
 * @returns {string}
 */
function packageNameForPath(resolvedPath) {
  const pkgJsonPath = findPackageJSON(pathToFileURL(resolvedPath))
  if (!pkgJsonPath) return '$root$'

  // Root project: package.json is not inside a node_modules subtree
  if (!pkgJsonPath.includes(`${path.sep}node_modules${path.sep}`)) {
    return '$root$'
  }

  if (cache.has(pkgJsonPath))
    return /** @type {string} */ (cache.get(pkgJsonPath))

  const { name } = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'))
  cache.set(pkgJsonPath, name)
  return name
}

module.exports = { packageNameForPath }
