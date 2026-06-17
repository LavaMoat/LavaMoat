/**
 * Resolves which bin script of an installed package to execute and where it
 * lives on disk.
 *
 * **All exports in this module are considered part of the public API.**
 *
 * @packageDocumentation
 */

import path from 'node:path'
import { PACKAGE_JSON } from './constants.js'
import {
  AmbiguousBinScriptError,
  NoBinScriptError,
  UnknownPackageError,
} from './error.js'
import { pathExists, readJsonFile } from './fs.js'
import { unscopedName } from './spec.js'

/**
 * @import {JsonValue} from 'type-fest'
 * @import {ResolvedBin} from './types.js'
 */

/**
 * Normalizes a package's `bin` field into a map of `{ binName: relativePath }`.
 *
 * Mirrors npm's semantics: a string `bin` maps to the package's unscoped name.
 *
 * @param {string} packageName Package name
 * @param {unknown} bin The raw `bin` field
 * @returns {Record<string, string>}
 */
export const normalizeBin = (packageName, bin) => {
  if (typeof bin === 'string') {
    return { [unscopedName(packageName)]: bin }
  }
  if (bin && typeof bin === 'object' && !Array.isArray(bin)) {
    /** @type {Record<string, string>} */
    const out = {}
    for (const [key, value] of Object.entries(bin)) {
      if (typeof value === 'string') {
        out[key] = value
      }
    }
    return out
  }
  return {}
}

/**
 * Reads the sandbox's `package.json` and determines the canonical name of the
 * single installed package.
 *
 * @param {string} sandboxDir Sandbox directory
 * @param {{
 *   hint?: string
 *   readJson?: typeof readJsonFile
 * }} [options]
 *   Options
 * @returns {Promise<string>}
 */
export const getInstalledPackageName = async (
  sandboxDir,
  { hint, readJson = readJsonFile } = {}
) => {
  /** @type {JsonValue} */
  let pkg
  try {
    pkg = await readJson(path.join(sandboxDir, PACKAGE_JSON))
  } catch (err) {
    throw new UnknownPackageError(
      `Could not read sandbox package.json in ${sandboxDir}`,
      { cause: err }
    )
  }
  const dependencies =
    pkg && typeof pkg === 'object' && !Array.isArray(pkg)
      ? /** @type {Record<string, unknown>} */ (pkg).dependencies
      : undefined
  const keys =
    dependencies && typeof dependencies === 'object'
      ? Object.keys(dependencies)
      : []

  if (hint && keys.includes(hint)) {
    return hint
  }
  if (keys.length === 1) {
    return /** @type {string} */ (keys[0])
  }
  if (hint) {
    return hint
  }
  throw new UnknownPackageError(
    `Could not determine the installed package name in ${sandboxDir}`
  )
}

/**
 * Resolves the bin script to execute for `packageName` installed in
 * `sandboxDir`.
 *
 * Selection order:
 *
 * 1. An explicit `call` name (must exist)
 * 2. A bin whose name equals the package's unscoped name
 * 3. The sole bin, if the package declares exactly one
 *
 * Otherwise an error is thrown.
 *
 * @param {string} sandboxDir Sandbox directory
 * @param {string} packageName Installed package name
 * @param {{
 *   call?: string
 *   readJson?: typeof readJsonFile
 *   exists?: typeof pathExists
 * }} [options]
 *   Options
 * @returns {Promise<ResolvedBin>}
 */
export const resolveBin = async (
  sandboxDir,
  packageName,
  { call, readJson = readJsonFile, exists = pathExists } = {}
) => {
  const packageDir = path.join(
    sandboxDir,
    'node_modules',
    ...packageName.split('/')
  )
  /** @type {JsonValue} */
  let pkg
  try {
    pkg = await readJson(path.join(packageDir, PACKAGE_JSON))
  } catch (err) {
    throw new NoBinScriptError(
      `Could not read package.json for "${packageName}"; was it installed?`,
      { cause: err }
    )
  }

  const bin =
    pkg && typeof pkg === 'object' && !Array.isArray(pkg)
      ? /** @type {Record<string, unknown>} */ (pkg).bin
      : undefined
  const binMap = normalizeBin(packageName, bin)
  const binNames = Object.keys(binMap)

  if (binNames.length === 0) {
    throw new NoBinScriptError(
      `Package "${packageName}" provides no bin script`
    )
  }

  /** @type {string} */
  let binName
  if (call) {
    if (!(call in binMap)) {
      throw new NoBinScriptError(
        `Package "${packageName}" has no bin named "${call}"; available: ${binNames.join(', ')}`
      )
    }
    binName = call
  } else {
    const unscoped = unscopedName(packageName)
    if (unscoped in binMap) {
      binName = unscoped
    } else if (binNames.length === 1) {
      binName = /** @type {string} */ (binNames[0])
    } else {
      throw new AmbiguousBinScriptError(
        `Package "${packageName}" exposes multiple bin scripts (${binNames.join(', ')}); choose one with --call`
      )
    }
  }

  const binPath = path.resolve(
    packageDir,
    /** @type {string} */ (binMap[binName])
  )
  if (!(await exists(binPath))) {
    throw new NoBinScriptError(
      `Bin script "${binName}" for "${packageName}" not found at ${binPath}`
    )
  }

  return { packageName, binName, binPath }
}
