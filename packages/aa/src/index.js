const { readFileSync, promises } = require('fs')
const path = require('path')
const nodeResolve = require('resolve')

let depsToWalkCache = new Map();
let depPackageJsonPathCache = new Map();


module.exports = {
  loadCanonicalNameMap,
  eachPackageInLogicalTree,
  getPackageDirForModulePath,
  getPackageNameForModulePath,
  depPackageJsonPathCache,
  depsToWalkCache
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
  for (const packageData of eachPackageInLogicalTree({ packageDir: rootDir, includeDevDeps, resolve, canonicalNameMap })) {
    // const logicalPathString = packageData.logicalPathParts.join('>')
    // filePathToLogicalPaths.add(packageData.packageDir, logicalPathString)
  }
  clearCaches();
  // for (const [packageDir, logicalPathSet] of filePathToLogicalPaths.entries()) {
  //   const shortestLogicalPathString = Array.from(logicalPathSet.values()).reduce((a, b) => a.length > b.length ? b : a)
  //   canonicalNameMap.set(packageDir, shortestLogicalPathString)
  // }
  // add root dir as "app"
  canonicalNameMap.set(rootDir, '$root$')
  Reflect.defineProperty(canonicalNameMap, 'rootDir', { value: rootDir })
  return canonicalNameMap
}
let hit = 0; let miss = 0;

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
      // TODO FIXME
      // resolve.sync is internally loading the package.json in order to resolve the package.json
      // the internal loadpkg is not exposed
      depPackageJsonPath = resolve.sync(depRelativePackageJsonPath, { basedir: packageDir })
    } catch (err) {
      if (!err.message.includes('Cannot find module')) {
        throw err
      }
      depPackageJsonPath = null
    }
    // cache result including misses
    depPackageJsonPathCache.set(key, depPackageJsonPath)
    return depPackageJsonPath
  }
}

function memoListDependencies(packageDir, includeDevDeps) {
  const key = packageDir + (includeDevDeps ? '-D' : '')
  if (depsToWalkCache.has(key)) {
    return depsToWalkCache.get(key)
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
    ].sort(comparePreferredPackageName)
    depsToWalkCache.set(key, depsToWalk)
    return depsToWalk
  }
}

function clearCaches() {
  depsToWalkCache = new Map();
  depPackageJsonPathCache = new Map();
}

const todos = [];
/**
 * @param {object} options
 * @returns {AsyncIterableIterator<{packageDir: string, logicalPathParts: string[]}>}
 */
function* eachPackageInLogicalTree({ packageDir, logicalPath = [], includeDevDeps = false, visited = new Set(), resolve = nodeResolve, canonicalNameMap }) {
  const bestSoFar = new Map()
  todos.push({ packageDir, logicalPath, includeDevDeps, visited, resolve })
  do {
    yield* processOnePackageInLogicalTree(bestSoFar)
  } while (todos.length > 0)

  // console.error({ hit, miss })
}

function processOnePackageInLogicalTree(bestSoFar) {
  // !!! important - this MUST be todos.pop() not todos.shift()
  // TODO: breadfirst should be faster (less wasted branch walks)
  // pop -> depth first
  const { packageDir, logicalPath = [], includeDevDeps = false, visited = new Set(), resolve = nodeResolve } = todos.pop();
  // shift -> breadth first BROKEN?
  // const { packageDir, logicalPath = [], includeDevDeps = false, visited = new Set(), resolve = nodeResolve } = todos.shift();
  const depsToWalk = memoListDependencies(packageDir, includeDevDeps)
  const results = [];

  // deps are already sorted by preference for paths
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

    // compare this path and current best path
    const theCurrentBest = bestSoFar.get(childPackageDir)
    if (comparePackageLogicalPaths(childLogicalPath, theCurrentBest) < 0) {
      // set as the new best so far
      bestSoFar.set(childPackageDir, childLogicalPath)
      // continue walking children
      todos.push({ packageDir: childPackageDir, logicalPath: childLogicalPath, includeDevDeps: false, visited: childVisited })
    } else {
      console.log(`skipping "${childPackageDir}"\n  preferred "${theCurrentBest}"\n  current "${childLogicalPath}"`)
      // abort this walk, can't do better
      continue
    }
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

// for file paths
function takeLongest(a, b) {
  return a.length > b.length ? a : b
}

// for package logical path names
function comparePreferredPackageName(a, b) {
  // prefer shorter package names
  if (a.length > b.length) {
    return 1
  } else if (a.length < b.length) {
    return -1
  }
  // prefer alphabetical order
  if (a > b) {
    return -1
  } else if (a > b) {
    return 1
  } else {
    return 0
  }
}

// is aPath better than bPath?
// iterate parts:
//   if a is better than b -> yes
//   if same -> continue
//   if worse -> no
function comparePackageLogicalPaths(aPath, bPath) {
  // undefined is not preferred
  if (aPath === undefined) {
    return 1
  }
  if (bPath === undefined) {
    return -1
  }
  // shortest path by part count is preferred
  if (aPath.length > bPath.length) {
    return 1
  } else if (aPath.length < bPath.length) {
    return -1
  }
  // prefer path ordered by preferred package names
  for (const index in aPath) {
    const a = aPath[index]
    const b = bPath[index]
    const comparison = comparePreferredPackageName(a, b)
    // console.log(`comparePreferredPackageName(${a}, ${b}) = ${comparison}`)
    if (comparison < 0) {
      return -1
    } else if (comparison > 0) {
      return 1
    } else {
      continue
    }
  }
  return 0
}
