// @ts-check

const path = require('node:path')
const { symlink, unlink } = require('node:fs/promises')

/**
 * @import {PathLike} from 'node:fs'
 */

/**
 * Normalizes paths in canonical name map entries
 *
 * @param {[string, string][]} arr
 * @returns {[string, string][]}
 */
exports.normalizePaths = (arr) => {
  return arr.map(([dirpath, name]) => [path.normalize(dirpath), name])
}

/**
 * @param {PathLike} target
 * @param {PathLike} path
 * @returns {Promise<void>}
 */
exports.osIndependentSymlink = async (target, path) => {
  try {
    await unlink(path)
  } catch (err) {
    // Ignore error if the symlink does not exist
    if (/** @type {NodeJS.ErrnoException} */ (err).code !== 'ENOENT') {
      throw err
    }
  }
  await symlink(
    target,
    path,
    'junction' // Ignored on POSIX, Windows only, same as pkg managers use
  )
}

/**
 * @returns {Promise<string>} Path to symlink
 */
exports.createProject4Symlink = async () => {
  const src = path.join(__dirname, 'projects', '4', 'node_modules', 'aaa')
  const target = path.join(__dirname, 'projects', '4', 'packages', 'aaa')
  await exports.osIndependentSymlink(target, src)
  return src
}
