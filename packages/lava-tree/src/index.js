'use strict'

const { promises: fs } = require('fs')
const path = require('path')
const { promisify } = require('util')
const resolve = promisify(require('resolve'))
// const semver = require('semver')
const logicalTree = require('npm-logical-tree')
const yarnLockfileParser = require('@yarnpkg/lockfile')
// const npmRunScript = require('@npmcli/run-script')
const yarnLogicalTree = require('./yarnLogicalTree')

const rootPackageQualifiedName = '<root>'

module.exports = {
  // uses fs
  loadTree,
  parseYarnLockForPackages,
  // uses fs + tree
  findAllFilePathsForTree,
  findFilePathForTreeNode,
  // uses tree
  createQualifiedNameLookupTable,
  // uses packageRootsMap
  lookupQualifiedNameForPath,
  // util
  getQualifiedNameDataForUrlForTreeNode,
  getQualifiedNameDataForUrl,
  getPackagePathDepth,
  packageRootsFromPath,
  isPathInside
}

async function parseYarnLockForPackages () {
  const yarnLockfileContent = await fs.readFile('./yarn.lock', 'utf8')
  const { object: parsedLockFile } = yarnLockfileParser.parse(yarnLockfileContent)
  // parsedLockFile contains an entry from each range to resolved package, so we dedupe
  const uniquePackages = new Set(Object.values(parsedLockFile))
  return Array.from(uniquePackages.values(), ({ resolved, version }) => {
    const { registry, qualifiedName } = getQualifiedNameDataForUrl(resolved)
    return { resolved, version, registry, qualifiedName }
  })
}

function getQualifiedNameDataForUrl (resolvedUrl) {
  const url = new URL(resolvedUrl)
  switch (url.host) {
    case 'registry.npmjs.org': {
      // eg: registry.npmjs.org:/@types/json5/-/json5-0.0.29.tgz
      const pathParts = url.pathname.split('/').slice(1)
      // support for org-namespaced packages
      const packageName = pathParts.slice(0, pathParts.indexOf('-')).join('/')
      return {
        registry: 'npm',
        qualifiedName: `${packageName}`
      }
    }
    case 'registry.yarnpkg.com': {
      const pathParts = url.pathname.split('/').slice(1)
      // support for org-namespaced packages
      const packageName = pathParts.slice(0, pathParts.indexOf('-')).join('/')
      return {
        registry: 'npm',
        qualifiedName: `${packageName}`
      }
    }
    case 'github.com': {
      // note: protocol may be "git+https" "git+ssh" or something else
      // eg: 'git+ssh://git@github.com/ethereumjs/ethereumjs-abi.git#1ce6a1d64235fabe2aaf827fd606def55693508f'
      const [, ownerName, repoRaw] = url.pathname.split('/')
      // remove final ".git"
      const repoName = repoRaw.split('.git').slice(0, -1).join('.git')
      return {
        registry: 'github',
        qualifiedName: `github:${ownerName}/${repoName}`
      }
    }
    case 'codeload.github.com': {
      // eg: https://codeload.github.com/LavaMoat/bad-idea-collection-non-canonical-keccak/tar.gz/d4718c405bd033928ebfedaca69f96c5d90ef4b0
      const [, ownerName, repoName] = url.pathname.split('/')
      return {
        registry: 'github',
        qualifiedName: `github:${ownerName}/${repoName}`
      }
    }
    case '': {
      // "github" as protocol
      // 'eg: github:ipfs/webrtcsupport#0a7099ff04fd36227a32e16966dbb3cca7002378'
      if (url.protocol !== 'github:') {
        throw new Error(`failed to parse qualified name from url: "${url}"`)
      }
      const [ownerName, repoName] = url.pathname.split('/')
      return {
        registry: 'github',
        qualifiedName: `github:${ownerName}/${repoName}`
      }
    }
    default: {
      return {
        registry: 'url',
        qualifiedName: `${url.host}:${url.pathname}`
      }
    }
  }
}

async function loadTree ({ rootDir }) {
  const packageJson = JSON.parse(await fs.readFile(path.join(rootDir, 'package.json'), 'utf8'))
  // attempt to load lock files
  let yarnLockfileContent
  let packageLockfileContent
  try {
    yarnLockfileContent = await fs.readFile(path.join(rootDir, 'yarn.lock'), 'utf8')
  } catch (err) { /* ignore error */ }
  try {
    packageLockfileContent = await fs.readFile(path.join(rootDir, 'package-lock.json'), 'utf8')
  } catch (err) { /* ignore error */ }
  if (yarnLockfileContent && packageLockfileContent) {
    console.warn('@lavamoat/lava-tree - both yarn and npm lock files detected -- using yarn')
    packageLockfileContent = undefined
  }
  let tree
  if (yarnLockfileContent) {
    const { object: parsedLockFile } = yarnLockfileParser.parse(yarnLockfileContent)
    tree = yarnLogicalTree.loadTree(packageJson, parsedLockFile)
    // fix path (via address field) for yarn tree
    for await (const { node, filepath } of findAllFilePathsForTree(tree)) {
      // skip unresolved paths
      if (!filepath) continue
      const relativePath = path.relative(rootDir, filepath)
      const address = relativePath.slice('node_modules/'.length).split('/node_modules/').join(':')
      node.address = address
    }
  } else if (packageLockfileContent) {
    const packageLock = JSON.parse(packageLockfileContent)
    tree = logicalTree(packageJson, packageLock)
  } else {
    throw new Error('@lavamoat/lava-tree - unable to find lock file (yarn or npm)')
  }

  return { tree, packageJson }
}

async function * findAllFilePathsForTree (tree, projectRoot = process.cwd()) {
  const filepathCache = new Map()
  for (const { node, branch, isRoot } of eachNodeInTree(tree)) {
    if (isRoot) {
      return { node, filepath: process.cwd() }
    }
    // my intention with yielding with a then is that it will be able to produce the
    // next iteration without waiting for the promise to resolve
    yield findFilePathForTreeNode(branch, filepathCache).then(filepath => {
      return { node, filepath }
    })
  }
}

async function findFilePathForTreeNode (branch, filepathCache) {
  const currentNode = branch[branch.length - 1]
  let resolvedPath
  if (branch.length < 2) {
    // root package should be handled elsewhere
    throw new Error('@lavamoat/lava-tree - failed to resolve path for node. tip: root package path should be resolved outside of findFilePathForTreeNode')
  } else {
    // dependency
    const parentNode = branch[branch.length - 2]
    const relativePath = filepathCache.get(parentNode)
    try {
      const packagePath = await resolve(`${currentNode.name}/package.json`, { basedir: relativePath })
      resolvedPath = path.dirname(packagePath)
    } catch (err) {
      // error if not a resolution error
      if (err.code !== 'MODULE_NOT_FOUND') {
        throw err
      }
      // error if non-optional
      const branchIsOptional = branch.some(node => node.optional)
      if (!branchIsOptional) {
        throw new Error(`@lavamoat/lava-tree - could not resolve non-optional package "${currentNode.name}" from "${relativePath}"`)
      }
      // otherwise ignore error
    }
  }
  filepathCache.set(currentNode, resolvedPath)
  return resolvedPath
}

function * eachNodeInTree (node, visited = new Set(), branch = []) {
  // visit each node only once
  if (visited.has(node)) return
  visited.add(node)
  // add self to branch
  branch.push(node)
  // visit
  yield { node, branch, isRoot: branch.length === 1 }
  // recurse
  for (const [, child] of node.dependencies) {
    yield * eachNodeInTree(child, visited, [...branch])
  }
}

function getQualifiedNameDataForUrlForTreeNode (node) {
  // node.resolved is only defined once (not for duplicates) in the tree for npm (?)
  if (node.resolved) {
    return getQualifiedNameDataForUrl(node.resolved)
  }
  throw new Error('@lavamoat/lava-tree - could not find resolved name')
  // // TODO: audit
  // const validSemver = semver.validRange(node.version)
  // if (validSemver) {
  //   return {
  //     registry: 'npm',
  //     qualifiedName: node.name
  //   }
  // } else {
  //   return getQualifiedNameDataForUrl(node.version)
  // }
}

// create a Map of (package root filepath) -> (qualified name)
function createQualifiedNameLookupTable (tree) {
  const packageRootMap = new Map()
  for (const { node, isRoot } of eachNodeInTree(tree)) {
    const nodePath = node.path()
    if (isRoot) {
      packageRootMap.set(nodePath, { qualifiedName: rootPackageQualifiedName })
    } else {
      const qualifiedNameData = getQualifiedNameDataForUrlForTreeNode(node)
      packageRootMap.set(nodePath, qualifiedNameData)
    }
  }
  return packageRootMap
}

// find the qualified name of the package a filepath corresponds to
function lookupQualifiedNameForPath (filepath, packageRootMap, platform = process.platform, pathSep = path.sep) {
  const matchingPackagePaths = filter(packageRootMap.keys(), packagePath => isPathInside(filepath, packagePath, platform))
  const packageRoot = takeHighest(matchingPackagePaths, filepath => getPackagePathDepth(filepath, pathSep))
  if (packageRoot == null) {
    throw new Error(`@lavamoat/lava-tree - could not find package root for path "${filepath}"`)
  }
  const qualifiedName = packageRootMap.get(packageRoot)
  return qualifiedName
}

// given a path relative to the project root, figure out how many packages deep is it
function getPackagePathDepth (pathRelativeToProjectRoot, pathSep) {
  return getCount(packageRootsFromPath(pathRelativeToProjectRoot, pathSep))
}

// given a path relative to the project root, return an iterator for each package root in the path
function * packageRootsFromPath (pathRelativeToProjectRoot, pathSep = path.sep) {
  const pathParts = String.prototype.split.call(pathRelativeToProjectRoot, pathSep)
  // carefully navigate filepath for pattern
  // node_modules/[${orgNamespace}/]${package}/[...repeat]
  // check if a project file or a dependency
  if (pathParts[0] !== 'node_modules') {
    return
  }
  let index = 1
  while (true) {
    // take unqualified package name, dont trust this value
    // only used for directory traversal
    let unqualifiedPackageName = pathParts[index]
    if (unqualifiedPackageName === undefined) {
      // done walking
      return
    }
    index++
    // check for org-namespaced packages
    if (unqualifiedPackageName[0] === '@') {
      const orgNamespace = unqualifiedPackageName
      const packageName = pathParts[index]
      unqualifiedPackageName = `${orgNamespace}/${packageName}`
      index++
    }
    // collect path for this package
    const packageRoot = pathParts.slice(0, index).join(pathSep)
    yield packageRoot
    // check if we continue deeper into the dep graph
    if (pathParts[index] !== 'node_modules') {
      // done walking
      return
    }
    // continue
    index += 1
  }
}

// check if childPath is inside (or the same as) parentPath
function isPathInside (childPath, parentPath, platform = 'linux') {
  if (platform === 'win32') {
    childPath = childPath.toLowerCase()
    parentPath = parentPath.toLowerCase()
  }

  return childPath.startsWith(parentPath)
}

// consume iterator, count entries, without retaining values
function getCount (iter) {
  let count = 0
  /* eslint-disable-next-line no-unused-vars */
  for (const entry of iter) {
    count++
  }
  return count
}

// filter iter values into a new iter
function * filter (iter, testFn) {
  for (const entry of iter) {
    if (testFn(entry)) yield entry
  }
}

// transform iter values and keep highest, without retaining values
function takeHighest (iter, testFn) {
  let result = null
  let value = null
  for (const entry of iter) {
    const testValue = testFn(entry)
    if (result === null || value < testValue) {
      result = entry
      value = testValue
    }
  }
  return result
}
