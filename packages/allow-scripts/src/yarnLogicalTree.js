'use strict'

const logicalTree = require('npm-logical-tree')
const semver = require('semver')

module.exports = { loadTree, makeNode }

function makeNode (name, address, opts) {
  return logicalTree.node(name, address, opts)
}

function loadTree (pkg, yarnLock) {
  const allDeps = new Map()
  // create a node for the root package
  const rootTreeNode = makeNode(pkg.name, null, pkg)
  const pkgDeps = Object.assign(
    {},
    pkg.devDependencies || {},
    pkg.optionalDependencies || {},
    pkg.dependencies || {}
  )
  // load all top level packages from the package.json
  Object.keys(pkgDeps)
    .forEach(name => {
      const semverString = pkgDeps[name]
      // console.log(`allDeps key ${name}@${semverString}`)
      let treeDep = allDeps.get(`${name}@${semverString}`)
      if (!treeDep) {
        const semverString = pkgDeps[name]
        const lockNode = yarnLock[`${name}@${semverString}`]
        if (!semver.validRange(semverString)) {
          // eg. file, url, etc.
          lockNode.version = semverString
        }
        treeDep = { node: makeNode(name, name, lockNode), semverString }
      }
      addChild(treeDep, { node: rootTreeNode }, allDeps, yarnLock)
    })
  return rootTreeNode
}

function addChild (treeDep, parentTreeEntry, allDeps, yarnLock) {
  const tree = parentTreeEntry.node
  const { node, semverString } = treeDep
  const lockNode = yarnLock[`${node.name}@${semverString}`]
  const dependencies = Object.assign(
    {},
    lockNode.optionalDependencies || {},
    lockNode.dependencies || {}
  )
  tree.addDep(node)
  // console.log(`allDeps key ${node.name}@${semverString}`)
  allDeps.set(`${node.name}@${semverString}`, treeDep)
  // load each dependency
  Object.keys(dependencies).forEach(name => {
    const childDepSemver = dependencies[name]
    let childDep = allDeps.get(`${name}@${childDepSemver}`)
    if (!childDep) {
      const childLockNode = yarnLock[`${name}@${childDepSemver}`]
      if (!childLockNode) {
        throw new Error(`${name} not accessible from ${node.name}`)
      }
      const { resolved, integrity } = childLockNode
      const optional = lockNode.optionalDependencies
        ? lockNode.optionalDependencies[name]
        : false
      const version = semver.validRange(childDepSemver)
        ? childLockNode.version
        : childDepSemver
      const opts = { optional, version, resolved, integrity }
      childDep = { node: makeNode(name, name, opts), semverString: childDepSemver }
      addChild(childDep, treeDep, allDeps, yarnLock)
    } else {
      node.addDep(childDep.node)
    }
  })
}
