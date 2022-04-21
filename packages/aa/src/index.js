const { readFileSync, promises } = require('fs')
const path = require('path')
const nodeResolve = require('resolve')

module.exports = {
  loadCanonicalNameMap,
  eachPackageInLogicalTree,
  getPackageDirForModulePath,
  getPackageNameForModulePath,
}

class SetMap {
  constructor() {
    this.map = new Map()
  }
  add(key, value) {
    let set = this.map.get(key)
    if (set === undefined) {
      set = new Set()
      this.map.set(key, set)
    }
    set.add(value)
  }
  get(key) {
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
async function loadCanonicalNameMap({ rootDir, includeDevDeps, resolve } = {}) {
  const filePathToLogicalPaths = new SetMap()
  const canonicalNameMap = new Map()
  // walk tree
  for (const packageData of eachPackageInLogicalTree({ packageDir: rootDir, includeDevDeps, resolve })) {
    const logicalPathString = packageData.logicalPathParts.join('>')
    filePathToLogicalPaths.add(packageData.packageDir, logicalPathString)
  }
  for (const [packageDir, logicalPathSet] of filePathToLogicalPaths.entries()) {
    const shortestLogicalPathString = Array.from(logicalPathSet.values()).reduce((a, b) => a.length > b.length ? b : a)
    canonicalNameMap.set(packageDir, shortestLogicalPathString)
  }
  // add root dir as "app"
  canonicalNameMap.set(rootDir, '$root$')
  Reflect.defineProperty(canonicalNameMap, 'rootDir', { value: rootDir })
  return canonicalNameMap
}
let hit = 0; let miss = 0;


let depPackageJsonPathCache = new Map();
function memoResolveSync(resolve, depName, packageDir) {
  const key = depName + '!' + packageDir;
  if (depPackageJsonPathCache.has(key)) {
    hit++
    return depPackageJsonPathCache.get(key)
  } else {
    miss++
    const depRelativePackageJsonPath = path.join(depName, 'package.json')
    let depPackageJsonPath
    // If this function used async, it'd have to be awaited, which would mean cache lookup 
    // would need to happen outside the function to save on performance of spawning a promise 
    // for each cache lookup.
    try {
      depPackageJsonPath = resolve.sync(depRelativePackageJsonPath, { basedir: packageDir })
      depPackageJsonPathCache.set(key, depPackageJsonPath)
    } catch (err) {
      if (!err.message.includes('Cannot find module')) {
        throw err
      }
      depPackageJsonPath = null
    }
    return depPackageJsonPath
  }
}
let depsToWalkCache = new Set();
function memoListDependencies(packageDir, includeDevDeps) {
  const key = packageDir + (includeDevDeps ? '-D' : '')
  if (depsToWalkCache.has(key)) {
    return [] //these dependencies were listed before, no need to revisit them
  } else {
    const packageJsonPath = path.join(packageDir, 'package.json')
    // If this function used async, it'd have to be awaited, which would mean cache lookup 
    // would need to happen outside the function to save on performance of spawning a promise 
    // for each cache lookup.
    const rawPackageJson = readFileSync(packageJsonPath, 'utf8')
    const packageJson = JSON.parse(rawPackageJson)
    const depsToWalk = [
      ...Object.keys(packageJson.dependencies || {}),
      ...Object.keys(packageJson.optionalDependencies || {}),
      ...Object.keys(packageJson.peerDependencies || {}),
      ...Object.keys(packageJson.bundledDependencies || {}),
      ...Object.keys(includeDevDeps ? packageJson.devDependencies || {} : {}),
    ]
    depsToWalkCache.add(key)
    return depsToWalk
  }
}

function clearCaches() {
  depsToWalkCache = new Set();
  depPackageJsonPathCache = new Map();
}

const todos = [];
/**
 * @param {object} options
 * @returns {AsyncIterableIterator<{packageDir: string, logicalPathParts: string[]}>}
 */
// TODO: optimize this to not walk the entire tree, can skip if the best known logical path is already shorter
function* eachPackageInLogicalTree({ packageDir, logicalPath = [], includeDevDeps = false, visited = new Set(), resolve = nodeResolve }) {
  todos.push({ packageDir, logicalPath, includeDevDeps, visited, resolve })
  do {
    yield* processOnePackageInLogicalTree()
  } while (todos.length > 0)

  // console.error({ hit, miss })
}

function processOnePackageInLogicalTree() {
  // !!! important - this MUST be todos.pop() not todos.shift()
  const { packageDir, logicalPath = [], includeDevDeps = false, visited = new Set(), resolve = nodeResolve } = todos.pop();
  const depsToWalk = memoListDependencies(packageDir, includeDevDeps)
  const results = [];
  for (const depName of depsToWalk) {
    let depPackageJsonPath
    depPackageJsonPath = memoResolveSync(resolve, depName, packageDir)
    // ignore unresolved deps
    if (depPackageJsonPath === null) {
      continue
    }
    const childPackageDir = path.dirname(depPackageJsonPath)
    // avoid cycles, but still visit the same package
    // on disk multiple times through different logical paths
    if (visited.has(childPackageDir)) {
      continue
    }
    const childVisited = new Set([...visited, childPackageDir])
    const childLogicalPath = [...logicalPath, depName]
    results.push({ packageDir: childPackageDir, logicalPathParts: childLogicalPath })
    todos.push({ packageDir: childPackageDir, logicalPath: childLogicalPath, includeDevDeps: false, visited: childVisited })
  }
  return results;
}

function getPackageNameForModulePath(canonicalNameMap, modulePath) {
  const packageDir = getPackageDirForModulePath(canonicalNameMap, modulePath)
  if (packageDir === undefined) {
    const relativeToRoot = path.relative(canonicalNameMap.rootDir, modulePath)
    return `external:${relativeToRoot}`
  }
  const packageName = canonicalNameMap.get(packageDir)
  const relativeToPackageDir = path.relative(packageDir, modulePath)
  // files should never be associated with a package directory across a package boundary (as tested via the presense of "node_modules" in the path)
  if (relativeToPackageDir.includes('node_modules')) {
    throw new Error(`LavaMoat - Encountered unknown package directory for file "${modulePath}"`)
  }
  return packageName
}

function getPackageDirForModulePath(canonicalNameMap, modulePath) {
  // find which of these directories the module is in
  const matchingPackageDirs = Array.from(canonicalNameMap.keys())
    .filter(packageDir => modulePath.startsWith(packageDir))
  if (matchingPackageDirs.length === 0) {
    return undefined
    // throw new Error(`Could not find package for module path: "${modulePath}" out of these package dirs:\n${Array.from(canonicalNameMap.keys()).join('\n')}`)
  }
  const longestMatch = matchingPackageDirs.reduce(takeLongest)
  return longestMatch
}

function takeLongest(a, b) {
  return a.length > b.length ? a : b
}