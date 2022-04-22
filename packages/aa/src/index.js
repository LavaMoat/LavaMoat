const { readFileSync } = require('fs')
const path = require('path')
const nodeResolve = require('resolve')

let depsToWalkCache = new Map();
let depPackageJsonPathCache = new Map();


module.exports = {
  loadCanonicalNameMap,
  walkDependencyTreeForBestLogicalPaths,
  getPackageDirForModulePath,
  getPackageNameForModulePath,
  depPackageJsonPathCache,
  depsToWalkCache
}

/**
 * @param {object} options
 * @returns {Promise<Map<string, string>>}
 */
async function loadCanonicalNameMap({ rootDir, includeDevDeps, resolve } = {}) {
  const canonicalNameMap = new Map()
  // walk tree
  const logicalPathMap = walkDependencyTreeForBestLogicalPaths({ packageDir: rootDir, includeDevDeps, resolve, canonicalNameMap })
  clearCaches()
  //convert dependency paths to canonical package names
  for (const [packageDir, logicalPathParts] of logicalPathMap.entries()) {
    const logicalPathString = logicalPathParts.join('>')
    canonicalNameMap.set(packageDir, logicalPathString)
  }
  // add root dir as "app"
  canonicalNameMap.set(rootDir, '$root$')
  Reflect.defineProperty(canonicalNameMap, 'rootDir', { value: rootDir })
  return canonicalNameMap
}

function memoResolveSync(resolve, depName, packageDir) {
  const key = depName + '!' + packageDir;
  if (depPackageJsonPathCache.has(key)) {
    return depPackageJsonPathCache.get(key)
  } else {
    const depRelativePackageJsonPath = path.join(depName, 'package.json')
    let depPackageJsonPath
    try {
      // TODO: small perf issue:
      // resolve.sync is internally loading the package.json in order to resolve the package.json
      depPackageJsonPath = resolve.sync(depRelativePackageJsonPath, { basedir: packageDir })
    } catch (err) {
      if (!err.message.includes('Cannot find module')) {
        throw err
      }
      depPackageJsonPath = null
      // debug: log resolution failures
      // console.log('resolve failed', depName, packageDir)
    }
    // cache result including misses
    depPackageJsonPathCache.set(key, depPackageJsonPath)
    return depPackageJsonPath
  }
}

function getDependencies(packageDir, includeDevDeps) {
  const key = packageDir
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
 * @returns {Map<{packageDir: string, logicalPathParts: string[]}>}
 */
function walkDependencyTreeForBestLogicalPaths({ packageDir, logicalPath = [], includeDevDeps = false, visited = new Set(), resolve = nodeResolve }) {
  const preferredPackageLogicalPathMap = new Map()
  // add the entry package as the first work unit
  todos.push({ packageDir, logicalPath, includeDevDeps, visited, resolve })
  // drain work queue until empty
  do {
    processOnePackageInLogicalTree(preferredPackageLogicalPathMap)
  } while (todos.length > 0)
  return preferredPackageLogicalPathMap
}

function processOnePackageInLogicalTree(preferredPackageLogicalPathMap) {
  const { packageDir, logicalPath = [], includeDevDeps = false, visited = new Set(), resolve = nodeResolve } = todos.pop();
  const depsToWalk = getDependencies(packageDir, includeDevDeps)
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
    const theCurrentBest = preferredPackageLogicalPathMap.get(childPackageDir)
    if (comparePackageLogicalPaths(childLogicalPath, theCurrentBest) < 0) {
      // debug: log extraneous path traversals
      // if (theCurrentBest !== undefined) {
      //   console.log(`extraneous "${childPackageDir}"\n  current "${theCurrentBest}"\n  preferd "${childLogicalPath}"`)
      // }
      // set as the new best so far
      preferredPackageLogicalPathMap.set(childPackageDir, childLogicalPath)
      // continue walking children, adding them to the end of the queue
      todos.unshift({ packageDir: childPackageDir, logicalPath: childLogicalPath, includeDevDeps: false, visited: childVisited })
    } else {
      // debug: log skipped path traversals
      // console.log(`skipping "${childPackageDir}"\n  preferred "${theCurrentBest}"\n  current "${childLogicalPath}"`)
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

// for comparing string lengths
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
  // as a tie breaker, prefer alphabetical order
  if (a > b) {
    return -1
  } else if (a > b) {
    return 1
  } else {
    return 0
  }
}

// for comparing package logical path arrays (shorter is better)
function comparePackageLogicalPaths(aPath, bPath) {
  // undefined is not preferred
  if (aPath === undefined && bPath === undefined) {
    return 0
  }
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
  // as a tie breaker, prefer path ordered by preferred package names
  // iterate parts:
  //   if a is better than b -> yes
  //   if worse -> no
  //   if same -> continue
  for (const index in aPath) {
    const a = aPath[index]
    const b = bPath[index]
    const comparison = comparePreferredPackageName(a, b)
    if (comparison === 0) {
      continue
    } else {
      return comparison
    }
  }
  return 0
}
