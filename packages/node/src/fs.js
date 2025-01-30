/**
 * Filesystem utilities
 *
 * @packageDocumentation
 */

import assert from 'node:assert'
import nodeFs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * @import {PathLike} from 'node:fs'
 * @import {WithFs} from './internal.js'
 */

/**
 * Reads a JSON file
 *
 * @template [T=unknown] Default is `unknown`
 * @param {string | URL} filepath
 * @param {WithFs} opts
 * @returns {Promise<T>} JSON data
 * @internal
 */
export const readJsonFile = async (filepath, { fs = nodeFs } = {}) => {
  if (filepath instanceof URL) {
    filepath = fileURLToPath(filepath)
  }
  const json = await fs.promises.readFile(filepath)
  return JSON.parse(`${json}`)
}

/**
 * Returns `true` if the file at `filepath` is a real file or a symlink to a
 * real file
 *
 * @param {PathLike} filepath Path to check
 * @param {WithFs} [options] Options
 * @returns {boolean}
 */
export const isFileSync = (filepath, { fs = nodeFs } = {}) => {
  return !!fs.statSync(filepath, { throwIfNoEntry: false })?.isFile()
}

/**
 * Returns `true` if the file at `filepath` is readable
 *
 * @param {PathLike} filepath
 * @param {WithFs} [options]
 * @returns {boolean}
 */
export const isReadablePathSync = (filepath, { fs = nodeFs } = {}) => {
  try {
    fs.accessSync(filepath, fs.constants.R_OK)
    return true
  } catch {
    return false
  }
}

/**
 * Returns `true` if the file at `filepath` is executable (and readable)
 *
 * Note: we will not actually execute the file, but we expect it to have the
 * proper permissions; this is used for locating an executable ("bin") script.
 *
 * @param {PathLike} filepath Path to check
 * @param {WithFs} [options] Options
 * @returns {boolean} `true` if the file is executable
 */
export const isExecutablePathSync = (filepath, { fs = nodeFs } = {}) => {
  try {
    fs.accessSync(filepath, fs.constants.X_OK | fs.constants.R_OK)
    return true
  } catch {
    return false
  }
}

/**
 * Returns `true` if the file at `filepath` is both a real file _and_ readable
 *
 * @param {PathLike} filepath Path to check
 * @param {WithFs} [options] Options
 * @returns {boolean} `true` if the file is readable
 */
export const isReadableFileSync = (filepath, options) => {
  return isFileSync(filepath, options) && isReadablePathSync(filepath, options)
}

/**
 * Returns `true` if the file at `filepath` is both a symlink _and_ executable
 * (and readable)
 *
 * @param {PathLike} filepath Path to check
 * @param {WithFs} [options] Options
 * @returns {boolean} `true` if the file is an executable symlink
 */
export const isExecutableSymlink = (filepath, options) => {
  return (
    isSymlinkSync(filepath, options) && isExecutablePathSync(filepath, options)
  )
}

/**
 * Returns `true` if the file at `filepath` is a symlink
 *
 * @param {PathLike} filepath Path to check
 * @param {WithFs} [options] Options
 * @returns {boolean} `true` if the file is a symlink
 */
export const isSymlinkSync = (filepath, { fs = nodeFs } = {}) => {
  return !!fs.lstatSync(filepath, { throwIfNoEntry: false })?.isSymbolicLink()
}

/**
 * Asserts a path is absolute
 *
 * @param {string} filepath Path to check
 * @param {string} [failureMessage] Message to include in the error if the path
 *   is not absolute
 * @returns {void}
 * @throws `AssertionError`
 */
export const assertAbsolutePath = (filepath, failureMessage) => {
  assert(isAbsolutePath(filepath), failureMessage)
}

/**
 * Returns `true` if `filepath` is absolute
 *
 * @param {string} filepath Path to check
 * @returns {boolean} `true` if the path is absolute
 */
export const isAbsolutePath = (filepath) => {
  return path.isAbsolute(filepath)
}

/**
 * Returns the "real" path of `filepath`
 *
 * @param {PathLike} filepath Path to check
 * @param {WithFs} options Options
 * @returns {string} Real path
 */
export const realpathSync = (filepath, { fs = nodeFs } = {}) => {
  // `realpath` can return a `Buffer` if you provide that as the desired encoding,
  // which is weird?
  return /** @type {string} */ (fs.realpathSync(filepath, 'utf8'))
}
