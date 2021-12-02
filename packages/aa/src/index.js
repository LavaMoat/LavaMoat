const { promises: fs } = require('fs')
const path = require('path')
const resolve = require('resolve')

module.exports = {
  loadCanonicalNameMap,
  eachPackageInLogicalTree,
}

class SetMap {
  constructor () {
    this.map = new Map()
  }
  add (key, value) {
    let set = this.map.get(key)
    if (set === undefined) {
      set = new Set()
      this.map.set(key, set)
    }
    set.add(value)
  }
  get (key) {
    return this.map.get(key)
  }
  entries() {
    return this.map.entries()
  }
}

/**
 * @param {object} options
 * @returns {Promise<Map<string, string>>}
 */
async function loadCanonicalNameMap ({ rootDir, includeDevDeps } = {}) {
  const filePathToLogicalPaths = new SetMap()
  const filePathToShortestLogicalPath = new Map()
  // walk tree
  for await (const packageData of eachPackageInLogicalTree({ packageDir: rootDir, includeDevDeps })) {
    const logicalPathString = packageData.logicalPathParts.join('>')
    filePathToLogicalPaths.add(packageData.packageDir, logicalPathString)
  }
  // find shortest logical path
  for (const [packageDir, logicalPathSet] of filePathToLogicalPaths.entries()) {
    const shortestLogicalPathString = Array.from(logicalPathSet.values()).reduce((a,b) => a.length > b.length ? b : a)
    filePathToShortestLogicalPath.set(packageDir, shortestLogicalPathString)
  }
  return filePathToShortestLogicalPath
}

/**
 * @param {object} options
 * @returns {AsyncIterableIterator<{packageDir: string, logicalPathParts: string[]}>}
 */
async function * eachPackageInLogicalTree ({ packageDir, logicalPath = [], includeDevDeps = false, visited = new Set() }) {
  const packageJsonPath = path.join(packageDir, 'package.json')
  const rawPackageJson = await fs.readFile(packageJsonPath, 'utf8')
  const packageJson = JSON.parse(rawPackageJson)
  const depsToWalk = [
    ...Object.keys(packageJson.dependencies || {}),
    ...Object.keys(includeDevDeps ? packageJson.devDependencies || {} : {}),
  ]
  for (const depName of depsToWalk) {
    const depRelativePackageJsonPath = path.join(depName, 'package.json')
    let depPackageJsonPath
    try {
      // sync seems slightly faster
      // depPackageJsonPath = await resolveAsync(depRelativePackageJsonPath, { basedir: packageJsonPath })
      depPackageJsonPath = resolve.sync(depRelativePackageJsonPath, { basedir: packageJsonPath })
    } catch (err) {
      console.error(err)
      continue
    }
    const depPath = path.dirname(depPackageJsonPath)
    // avoid cycles
    if (visited.has(depPath)) {
      continue
    }
    visited.add(depPath)
    const childLogicalPath = [...logicalPath, depName]
    yield { packageDir: depPath, logicalPathParts: childLogicalPath }
    yield* eachPackageInLogicalTree({ packageDir: depPath, logicalPath: childLogicalPath, includeDevDeps: false, visited })
  }
}
