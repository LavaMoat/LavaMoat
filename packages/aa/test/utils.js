const path = require('node:path')
const { symlink } = require('node:fs/promises')
const { existsSync } = require('node:fs')

/**
 * Normalizes paths in canonical name map entries
 *
 * @param {[string, string][]} arr
 * @returns {[string, string][]}
 */
exports.normalizePaths = (arr) => {
  return arr.map(([dirpath, name]) => [path.normalize(dirpath), name])
}

exports.osIndependentSymlink = async (target, src) => {
  if (!existsSync(src)) {
    await symlink(
      target,
      src,
      'junction' // Ignored on POSIX, Windows only, same as pkg managers use
    )
  }
}
exports.createProject4Symlink = async () => {
  const src = path.join(__dirname, 'projects', '4', 'node_modules', 'aaa')
  const target = path.join(__dirname, 'projects', '4', 'packages', 'aaa')
  await exports.osIndependentSymlink(target, src)
}
