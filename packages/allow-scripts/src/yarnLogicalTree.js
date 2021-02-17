'use strict'

const logicalTree = require('npm-logical-tree')
const semver = require('semver')

module.exports = { loadTree, makeNode }

function makeNode (name, address, opts) {
  return logicalTree.node(name, address, opts)
}

/*
-
*/

// function loadTree (pkg, yarnLock, opts) {
//   const tree = makeNode(pkg.name, null, pkg)
//   const allDeps = new Map()
//   const pkgDeps = Array.from(
//     new Set(Object.keys(pkg.devDependencies || {})
//     .concat(Object.keys(pkg.optionalDependencies || {}))
//     .concat(Object.keys(pkg.dependencies || {})))
//   )
//   pkgDeps.forEach(name => {
//     let dep = allDeps.get(name)
//     if (!dep) {
//       const semverString = pkgDeps[name]
//       const packageSelector = `${name}@${semverString}`
//       const lockNode = yarnLock[packageSelector]
//       // bundled?
//       let { version, bundled, resolved, integrity } = lockNode
//       // set version if non-canonical
//       if (!semver.validRange(semverString)) {
//         // eg. file, url, etc.
//         version = semverString
//       }
//       // top-level optional?
//       const optional = false
//       const opts = { version, optional, bundled, resolved, integrity }
//       dep = makeNode(name, name, opts)
//     }
//     addChild(dep, tree, allDeps, yarnLock)
//   })
//   return tree
// }

// module.exports.node = makeNode
// function makeNode (name, address, opts) {
//   return new LogicalTree(name, address, opts || {})
// }

// function addChild (dep, tree, allDeps, yarnLock) {
//   tree.addDep(dep)
//   allDeps.set(dep.address, dep)
//   const addr = dep.address
//   const lockNode = atAddr(yarnLock, addr)
//   Object.keys(lockNode.requires || {}).forEach(name => {
//     const tdepAddr = _reqAddr(yarnLock, name, addr)
//     let tdep = allDeps.get(tdepAddr)
//     if (!tdep) {
//       tdep = makeNode(name, tdepAddr, atAddr(yarnLock, tdepAddr))
//       addChild(tdep, dep, allDeps, yarnLock)
//     } else {
//       dep.addDep(tdep)
//     }
//   })
// }

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

// function reqAddr (yarnLock, name, fromAddr) {
//   const lockNode = atAddr(yarnLock, fromAddr)
//   const child = (lockNode.dependencies || {})[name]
//   if (child) {
//     return `${fromAddr}:${name}`
//   } else {
//     const parts = fromAddr.split(':')
//     while (parts.length) {
//       parts.pop()
//       const joined = parts.join(':')
//       const parent = atAddr(yarnLock, joined)
//       if (parent) {
//         const child = (parent.dependencies || {})[name]
//         if (child) {
//           return `${joined}${parts.length ? ':' : ''}${name}`
//         }
//       }
//     }
//     const err = new Error(`${name} not accessible from ${fromAddr}`)
//     err.yarnLock = yarnLock
//     err.target = name
//     err.from = fromAddr
//     throw err
//   }
// }

// function atAddr (yarnLock, addr) {
//   if (!addr.length) { return yarnLock }
//   const parts = addr.split(':')
//   return parts.reduce((acc, next) => {
//     return acc && (acc.dependencies || {})[next]
//   }, yarnLock)
// }
