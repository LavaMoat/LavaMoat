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

exports.bench = (fn, name, iterations = 10000) => {
  const t0 = performance.now()
  for (let i = 0; i < iterations; i++) {
    fn()
  }
  const t1 = performance.now()
  return { [name]: (t1 - t0) / iterations }
}

exports.benchAsync = async (fn, name, iterations = 1000) => {
  const t0 = performance.now()
  for (let i = 0; i < iterations; i++) {
    await fn()
  }
  const t1 = performance.now()
  return { [name]: (t1 - t0) / iterations }
}
