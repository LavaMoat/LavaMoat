'use strict'

const path = require('path')
const Arborist = require('@npmcli/arborist')

const rootPackageQualifiedName = '<root>'

module.exports = {
  // uses fs
  loadTree,
  // uses tree
  createQualifiedNameLookupTable,
  // uses packageRootsMap
  lookupQualifiedNameDataForPath,
  // util
  eachNodeInTree,
  getQualifiedNameDataForTreeNode,
  getQualifiedNameDataForUrl,
  getPackagePathDepth,
  packageRootsFromPath,
  isPathInside
}

async function loadTree ({ projectRoot = process.cwd() } = {}) {
  const arb = new Arborist({
    path: projectRoot
  })
  const tree = await arb.loadActual()
  return tree
}

function getQualifiedNameDataForUrl (resolvedUrl) {
  const url = new URL(resolvedUrl)
  switch (url.protocol) {
    case 'https:': {
      return getQualifiedNameDataForHttps(url)
    }
    case 'github:': {
      return getQualifiedNameDataForGithub(url)
    }
    case 'git+ssh:': {
      return getQualifiedNameDataForGit(url)
    }
    case 'git+https:': {
      return getQualifiedNameDataForGit(url)
    }
    case 'file:': {
      return getQualifiedNameDataForFile(url)
    }
    default: {
      throw new Error(`@lavamoat/lava-tree - unable to parse qualfied name for resolved url "${resolvedUrl}". unknown protocol "${url.protocol}"`)
    }
  }
}

function getQualifiedNameDataForHttps (url) {
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
    case 'codeload.github.com': {
      // eg: https://codeload.github.com/LavaMoat/bad-idea-collection-non-canonical-keccak/tar.gz/d4718c405bd033928ebfedaca69f96c5d90ef4b0
      const [, ownerName, repoName] = url.pathname.split('/')
      return {
        registry: 'github',
        qualifiedName: `github:${ownerName}/${repoName}`
      }
    }
    default: {
      return {
        registry: 'http',
        qualifiedName: `http:${url.host}/${url.pathname}`
      }
    }
  }
}

function getQualifiedNameDataForGithub (url) {
  // "github" as protocol
  // 'eg: github:ipfs/webrtcsupport#0a7099ff04fd36227a32e16966dbb3cca7002378'
  const [ownerName, repoName] = url.pathname.split('/')
  return {
    registry: 'github',
    qualifiedName: `github:${ownerName}/${repoName}`
  }
}

function getQualifiedNameDataForGit (url) {
  switch (url.host) {
    case 'github.com': {
      // note: protocol may be "git+https" "git+ssh"
      // eg: 'git+ssh://git@github.com/ethereumjs/ethereumjs-abi.git#1ce6a1d64235fabe2aaf827fd606def55693508f'
      const [, ownerName, repoRaw] = url.pathname.split('/')
      // remove final ".git"
      const repoName = repoRaw.split('.git').slice(0, -1).join('.git')
      return {
        registry: 'github',
        qualifiedName: `github:${ownerName}/${repoName}`
      }
    }
    default: {
      return {
        registry: 'git',
        qualifiedName: `git:${url.host}/${url.path}`
      }
    }
  }
}

function getQualifiedNameDataForFile (url) {
  // eg: 'file:///packages/lava-tree'
  return {
    registry: 'file',
    qualifiedName: `file:${url.pathname}`
  }
}

function * eachNodeInTree (node, branch = []) {
  // add self to branch
  branch.push(node)
  // visit
  yield { node, branch, isRoot: branch.length === 1 }
  // recurse
  if (!node.children) return
  for (const child of node.children.values()) {
    yield * eachNodeInTree(child, [...branch])
  }
}

function getQualifiedNameDataForTreeNode (node) {
  // node.resolved is only defined once (not for duplicates) in the tree for npm (?)
  if (node.resolved) {
    return getQualifiedNameDataForUrl(node.resolved)
  } else if (node.inBundle) {
    // if dep is "bundled" use the qualified name for the package that bundled it
    return getQualifiedNameDataForTreeNode(node.parent)
  }
  throw new Error(`@lavamoat/lava-tree - could not find qualified name for package "${node.name}" at "${node.realpath}"`)
}

// create a Map of (package root filepath) -> (qualified name)
function createQualifiedNameLookupTable (tree, projectRoot) {
  const packageRootMap = new Map()
  for (const { node, isRoot } of eachNodeInTree(tree)) {
    const nodePath = path.relative(projectRoot, node.realpath)
    if (isRoot) {
      packageRootMap.set(nodePath, { qualifiedName: rootPackageQualifiedName })
    } else {
      const qualifiedNameData = getQualifiedNameDataForTreeNode(node)
      packageRootMap.set(nodePath, qualifiedNameData)
    }
  }
  return packageRootMap
}

// find the qualified name of the package a filepath corresponds to
function lookupQualifiedNameDataForPath (filepath, packageRootMap, platform = process.platform, pathSep = path.sep) {
  const matchingPackagePaths = filter(packageRootMap.keys(), packagePath => isPathInside(filepath, packagePath, platform))
  // we can just take the longest path because all matching paths are in one "branch" of the filesystem (no forks)
  const packageRoot = takeHighest(matchingPackagePaths, filepath => filepath.length)
  // const packageRoot = takeHighest(matchingPackagePaths, filepath => getPackagePathDepth(filepath, pathSep))
  if (packageRoot == null) {
    throw new Error(`@lavamoat/lava-tree - could not find package root for path "${filepath}"`)
  }
  const qualifiedName = packageRootMap.get(packageRoot)
  return qualifiedName
}

// given a path relative to the project root, figure out how many packages deep is it
function getPackagePathDepth (pathRelativeToProjectRoot, pathSep) {
  // count the number of packages represented in the path
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
