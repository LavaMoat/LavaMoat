'use strict'

const { readFileSync } = require('fs')
const path = require('path')
const nodeResolve = require('resolve')

module.exports = {
  loadCanonicalNameMap,
  walkDependencyTreeForBestLogicalPaths,
  getPackageDirForModulePath,
  getPackageNameForModulePath,
  createPerformantResolve,
}

/**
 * @returns {Resolver}
 */
function createPerformantResolve() {
  /**
   * @param {string} self
   * @returns {(readFileSync: (file: string) => (string|{toString(): string}), pkgfile: string) => Record<string,unknown>}
   */
  const readPackageWithout = (self) => (readFileSync, pkgfile) => {
    // avoid loading the package.json we're just trying to resolve
    if (pkgfile.endsWith(self)) {
      return {}
    }
    // original readPackageSync implementation from resolve internals:
    var body = readFileSync(pkgfile)
    try {
      // @ts-expect-error - JSON.parse calls toString() on its parameter if not given a string
      var pkg = JSON.parse(body)
      return pkg
    } catch (jsonErr) {}
  }

  return {
    sync: (path, { basedir }) =>
      nodeResolve.sync(path, {
        basedir,
        readPackageSync: readPackageWithout(path),
      }),
  }
}

/**
 * @param {LoadCanonicalNameMapOpts} options
 * @returns {Promise<CanonicalNameMap>}
 */
async function loadCanonicalNameMap({ rootDir, includeDevDeps, resolve }) {
  const canonicalNameMap = /** @type {CanonicalNameMap} */ (new Map())
  // performant resolve avoids loading package.jsons if their path is what's being resolved,
  // offering 2x performance improvement compared to using original resolve
  resolve = resolve || createPerformantResolve()
  // resolve = resolve || nodeResolve
  // walk tree
  const logicalPathMap = walkDependencyTreeForBestLogicalPaths({
    packageDir: rootDir,
    includeDevDeps,
    resolve,
  })
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

/**
 * @param {Resolver} resolve
 * @param {string} depName
 * @param {string} packageDir
 * @returns {string|undefined}
 */
function wrappedResolveSync(resolve, depName, packageDir) {
  const depRelativePackageJsonPath = path.join(depName, 'package.json')
  try {
    return resolve.sync(depRelativePackageJsonPath, { basedir: packageDir })
  } catch {}
  try {
    return createPerformantResolve().sync(depRelativePackageJsonPath, {
      basedir: packageDir,
    })
  } catch (err) {
    if (!(/** @type {Error} */ (err).message.includes('Cannot find module'))) {
      throw err
    }
    // debug: log resolution failures
    // console.log('resolve failed', depName, packageDir)
  }
}

/**
 * @param {string} packageDir
 * @param {boolean} includeDevDeps
 * @returns {string[]}
 */
function getDependencies(packageDir, includeDevDeps) {
  const packageJsonPath = path.join(packageDir, 'package.json')
  const rawPackageJson = readFileSync(packageJsonPath, 'utf8')
  const packageJson = JSON.parse(rawPackageJson)
  const depsToWalk = [
    ...Object.keys(packageJson.dependencies || {}),
    ...Object.keys(packageJson.optionalDependencies || {}),
    ...Object.keys(packageJson.peerDependencies || {}),
    ...Object.keys(includeDevDeps ? packageJson.devDependencies || {} : {}),
  ].sort(comparePreferredPackageName)
  return depsToWalk
}

/** @type {WalkDepTreeOpts[]} */
let currentLevelTodos

/** @type {WalkDepTreeOpts[]} */
let nextLevelTodos

/**
 * @param {WalkDepTreeOpts} options
 * @returns {Map<string, string[]>}
 */
function walkDependencyTreeForBestLogicalPaths({
  packageDir,
  logicalPath = [],
  includeDevDeps = false,
  visited = new Set(),
  resolve,
}) {
  resolve = resolve ?? createPerformantResolve()
  /** @type {Map<string, string[]>} */
  const preferredPackageLogicalPathMap = new Map()
  // add the entry package as the first work unit
  currentLevelTodos = [
    { packageDir, logicalPath, includeDevDeps, visited, resolve },
  ]
  nextLevelTodos = []
  // drain work queue until empty, avoid going depth-first by prioritizing the current depth level
  do {
    processOnePackageInLogicalTree(preferredPackageLogicalPathMap, resolve)
    if (currentLevelTodos.length === 0) {
      currentLevelTodos = nextLevelTodos
      nextLevelTodos = []
    }
  } while (currentLevelTodos.length > 0)

  return preferredPackageLogicalPathMap
}

/**
 * @param {Map<string, string[]>} preferredPackageLogicalPathMap
 * @param {Resolver} resolve
 */
function processOnePackageInLogicalTree(
  preferredPackageLogicalPathMap,
  resolve
) {
  const {
    packageDir,
    logicalPath = [],
    includeDevDeps = false,
    visited = new Set(),
  } = /** @type {WalkDepTreeOpts} */ (currentLevelTodos.pop())
  const depsToWalk = getDependencies(packageDir, includeDevDeps)

  // deps are already sorted by preference for paths
  for (const depName of depsToWalk) {
    let depPackageJsonPath = wrappedResolveSync(resolve, depName, packageDir)
    // ignore unresolved deps
    if (!depPackageJsonPath) {
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
      nextLevelTodos.push({
        packageDir: childPackageDir,
        logicalPath: childLogicalPath,
        includeDevDeps: false,
        visited: childVisited,
      })
    } else {
      // debug: log skipped path traversals
      // console.log(`skipping "${childPackageDir}"\n  preferred "${theCurrentBest}"\n  current "${childLogicalPath}"`)
      // abort this walk, can't do better
      continue
    }
  }
}

/**
 * @param {CanonicalNameMap} canonicalNameMap
 * @param {string} modulePath
 * @returns {string}
 */
function getPackageNameForModulePath(canonicalNameMap, modulePath) {
  const packageDir = getPackageDirForModulePath(canonicalNameMap, modulePath)
  if (packageDir === undefined) {
    const relativeToRoot = path.relative(canonicalNameMap.rootDir, modulePath)
    return `external:${relativeToRoot}`
  }
  const packageName = /** @type {string} */ (canonicalNameMap.get(packageDir))
  const relativeToPackageDir = path.relative(packageDir, modulePath)
  // files should never be associated with a package directory across a package boundary (as tested via the presense of "node_modules" in the path)
  if (relativeToPackageDir.includes('node_modules')) {
    throw new Error(
      `LavaMoat - Encountered unknown package directory for file "${modulePath}"`
    )
  }
  return packageName
}

/**
 * @param {CanonicalNameMap} canonicalNameMap
 * @param {string} modulePath
 * @returns {string|undefined}
 */
function getPackageDirForModulePath(canonicalNameMap, modulePath) {
  // find which of these directories the module is in
  const matchingPackageDirs = Array.from(canonicalNameMap.keys()).filter(
    (packageDir) => modulePath.startsWith(packageDir)
  )
  if (matchingPackageDirs.length === 0) {
    return undefined
    // throw new Error(`Could not find package for module path: "${modulePath}" out of these package dirs:\n${Array.from(canonicalNameMap.keys()).join('\n')}`)
  }
  const longestMatch = matchingPackageDirs.reduce(takeLongest)
  return longestMatch
}

/**
 * for comparing string lengths
 * @param {string} a
 * @param {string} b
 * @returns {string}
 */
function takeLongest(a, b) {
  return a.length > b.length ? a : b
}

/**
 * for package logical path names
 * @param {string} a
 * @param {string} b
 * @returns {0|1|-1}
 */
function comparePreferredPackageName(a, b) {
  // prefer shorter package names
  if (a.length > b.length) {
    return 1
  } else if (a.length < b.length) {
    return -1
  }
  // as a tie breaker, prefer alphabetical order
  if (a < b) {
    return -1
  } else if (a > b) {
    return 1
  } else {
    return 0
  }
}

/**
 * for comparing package logical path arrays (shorter is better)
 * @param {string[]} [aPath]
 * @param {string[]} [bPath]
 * @returns {0|1|-1}
 */
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

/**
 * @typedef Resolver
 * @property {(path: string, opts: {basedir: string}) => string} sync
 */

/**
 * @typedef LoadCanonicalNameMapOpts
 * @property {string} rootDir
 * @property {boolean} [includeDevDeps]
 * @property {Resolver} [resolve]
 */

/**
 * @internal
 * @typedef WalkDepTreeOpts
 * @property {string} packageDir
 * @property {string[]} [logicalPath]
 * @property {boolean} [includeDevDeps]
 * @property {Set<string>} [visited]
 * @property {Resolver} [resolve]
 */

/**
 * @typedef {Map<string, string> & {rootDir: string}} CanonicalNameMap
 */
