'use strict'

const { readFileSync, realpathSync, lstatSync } = require('node:fs')
const path = require('node:path')
const nodeResolve = require('resolve/sync')

module.exports = {
  loadCanonicalNameMap,
  walkDependencyTreeForBestLogicalPaths,
  getPackageDirForModulePath,
  getPackageNameForModulePath,
  createPerformantResolve,
}

/**
 * Default resolver if none provided
 */
const performantResolve = createPerformantResolve()

/**
 * A `string` or something coercible to a `string`
 *
 * @remarks
 * This is equivalent to the internal `StringOrToString` type of `resolve`
 * @typedef {string | { toString: () => string }} StringOrToString
 */

/**
 * Performant resolve avoids loading package.jsons if their path is what's being
 * resolved, offering 2x performance improvement compared to using original
 * resolve
 *
 * This resolver, using the `resolve` package, is incompatible with subpath
 * exports.
 *
 * @returns {Resolver}
 * @see {@link https://npm.im/resolve}
 * @see {@link https://nodejs.org/api/packages.html#subpath-exports}
 */
function createPerformantResolve() {
  /**
   * @param {string} filepath
   */
  const readPackageWithout = (filepath) => {
    /**
     * @param {(path: string) => StringOrToString} readFileSync - Sync file
     *   reader
     * @param {string} otherFilepath - Path to another `package.json`
     * @returns {Record<string, unknown> | undefined}
     */
    return (readFileSync, otherFilepath) => {
      // avoid loading the package.json we're just trying to resolve
      if (otherFilepath.endsWith(filepath)) {
        return {}
      }
      // original readPackageSync implementation from resolve internals:
      const body = readFileSync(otherFilepath)
      try {
        return JSON.parse(`${body}`)
      } catch (jsonErr) {}
    }
  }

  return {
    sync: (path, { basedir }) =>
      nodeResolve(path, {
        basedir,
        readPackageSync: readPackageWithout(path),
      }),
  }
}

/**
 * @param {LoadCanonicalNameMapOpts} options
 * @returns {Promise<CanonicalNameMap>}
 */
async function loadCanonicalNameMap({
  rootDir,
  includeDevDeps,
  resolve = performantResolve,
}) {
  const canonicalNameMap = /** @type {CanonicalNameMap} */ (new Map())
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
 * Resolves `package.json` of a dependency relative to `basedir`
 *
 * @param {Resolver} resolve - Resolver function
 * @param {string} depName - Dependency name
 * @param {string} basedir - Dir to resolve from
 * @returns {string | undefined}
 */
function wrappedResolveSync(resolve, depName, basedir) {
  const depRelativePackageJsonPath = path.join(depName, 'package.json')
  try {
    return resolve.sync(depRelativePackageJsonPath, {
      basedir,
    })
  } catch (e) {
    const err = /** @type {Error} */ (e)
    if (
      err &&
      typeof err === 'object' &&
      (('code' in err && err.code === 'MODULE_NOT_FOUND') ||
        err.message?.startsWith('Cannot find module'))
    ) {
      return
    }
    throw err
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

/**
 * @param {string} location
 */
function isSymlink(location) {
  const info = lstatSync(location)
  return info.isSymbolicLink()
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
  resolve = performantResolve,
}) {
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

  for (const [
    packageDir,
    logicalPath,
  ] of preferredPackageLogicalPathMap.entries()) {
    if (isSymlink(packageDir)) {
      const realPath = realpathSync(packageDir)
      preferredPackageLogicalPathMap.set(realPath, logicalPath)
    }
  }
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
      `LavaMoat - Encountered unknown package directory "${relativeToPackageDir}" for file "${modulePath}"`
    )
  }
  return packageName
}

/**
 * @param {CanonicalNameMap} canonicalNameMap
 * @param {string} modulePath
 * @returns {string | undefined}
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
 * For comparing string lengths
 *
 * @param {string} a
 * @param {string} b
 * @returns {string}
 */
function takeLongest(a, b) {
  return a.length > b.length ? a : b
}

/**
 * For package logical path names
 *
 * @param {string} a
 * @param {string} b
 * @returns {0 | 1 | -1}
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
 * For comparing package logical path arrays (shorter is better)
 *
 * @param {string[]} [aPath]
 * @param {string[]} [bPath]
 * @returns {0 | 1 | -1}
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
 * @property {(path: string, opts: { basedir: string }) => string} sync
 */

/**
 * @typedef LoadCanonicalNameMapOpts
 * @property {string} rootDir
 * @property {boolean} [includeDevDeps]
 * @property {Resolver} [resolve]
 */

/**
 * @typedef WalkDepTreeOpts
 * @property {string} packageDir
 * @property {string[]} [logicalPath]
 * @property {boolean} [includeDevDeps]
 * @property {Set<string>} [visited]
 * @property {Resolver} [resolve]
 * @internal
 */

/**
 * @typedef {Map<string, string> & { rootDir: string }} CanonicalNameMap
 */
