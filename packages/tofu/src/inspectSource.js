const acornGlobals = require('acorn-globals')
const walk = require('acorn-walk')
const standardJsGlobals = require('./standardGlobals.js')

const {
  getMemberExpressionNesting,
  getPathFromMemberExpressionChain,
  reduceToTopmostApiCalls,
  addGlobalUsage
} = require('./util')

module.exports = { inspectGlobals, inspectImports }

function inspectGlobals (source, {
  ignoredRefs = [],
  globalRefs = [],
  languageRefs = standardJsGlobals
} = {}) {
  const ast = (typeof source === 'object') ? source : acornGlobals.parse(source)
  const detectedGlobals = acornGlobals(ast)

  const globalsConfig = new Map()
  // check for global refs with member expressions
  detectedGlobals.forEach(inspectDetectedGlobalVariables)
  // reduce to remove more deep results that overlap with broader results
  // e.g. [`x.y.z`, `x.y`] can be reduced to just [`x.y`]
  reduceToTopmostApiCalls(globalsConfig)

  return globalsConfig

  function inspectDetectedGlobalVariables (variable) {
    const variableName = variable.name
    // skip if module global
    if (ignoredRefs.includes(variableName)) return
    // expose API as granularly as possible
    variable.nodes.forEach(identifierNode => {
      const { path, identifierUse, parent } = inspectIdentifierForDirectMembershipChain(variableName, identifierNode)
      // if nested API lookup begins with a globalRef, drop it
      if (globalRefs.includes(path[0])) {
        path.shift()
      }

      // inspect for destructuring
      let destructuredPaths
      if (parent.type === 'VariableDeclarator' && ['ObjectPattern', 'ArrayPattern'].includes(parent.id.type)) {
        destructuredPaths = (
          inspectPatternElementForPaths(parent.id)
            .map(partial => [...path, ...partial])
        )
      } else {
        destructuredPaths = [path]
      }

      destructuredPaths.forEach(path => {
        // skip if global and only used for detecting presence
        if (path.length === 0) return
        // submit as a global usage
        const pathString = path.join('.')
        maybeAddGlobalUsage(pathString, identifierUse)
      })
    })
  }

  function inspectIdentifierForDirectMembershipChain (variableName, identifierNode) {
    let identifierUse = 'read'
    const { memberExpressions, parentOfMembershipChain, topmostMember } = getMemberExpressionNesting(identifierNode)
    // determine if used in an assignment expression
    const isAssignment = parentOfMembershipChain.type === 'AssignmentExpression'
    const isAssignmentTarget = parentOfMembershipChain.left === topmostMember
    if (isAssignment && isAssignmentTarget) {
      // this membership chain is being assigned to
      identifierUse = 'write'
    }
    // if not used in any member expressions AND is not a global ref, expose as is
    if (!memberExpressions.length) {
      return { identifierUse, path: [variableName], parent: parentOfMembershipChain }
    }
    const path = [variableName, ...getPathFromMemberExpressionChain(memberExpressions)]
    return { identifierUse, path, parent: parentOfMembershipChain }
  }

  function maybeAddGlobalUsage (identifierPath, identifierUse) {
    const topmostRef = identifierPath.split('.')[0]
    // skip language features
    if (languageRefs.includes(topmostRef)) return
    // skip ignored globals
    if (ignoredRefs.includes(topmostRef)) return
    addGlobalUsage(globalsConfig, identifierPath, identifierUse)
  }
}

function inspectImports (source, packagesToInspect) {
  const ast = (typeof source === 'object') ? source : acornGlobals.parse(source)
  let cjsImports = []
  walk.ancestor(ast, {
    CallExpression: function (node, parents) {
      const { callee, arguments: [moduleNameNode] } = node
      if (callee.type !== 'Identifier') return
      if (callee.name !== 'require') return
      if (moduleNameNode.type !== 'Literal') return
      const moduleName = moduleNameNode.value
      // skip if not specified in "packagesToInspect"
      if (packagesToInspect && !packagesToInspect.includes(moduleName)) return
      // inspect for members
      node.parents = parents
      const { memberExpressions, parentOfMembershipChain } = getMemberExpressionNesting(node)
      const initialPath = [moduleName, ...getPathFromMemberExpressionChain(memberExpressions)]
      // exit early if unrecognized parent
      if (parentOfMembershipChain.type !== 'VariableDeclarator') {
        // not sure when this is would be hit?
        cjsImports.push(initialPath)
        return
      }
      // inspect for destructuring
      cjsImports = cjsImports.concat(
        inspectPatternElementForPaths(parentOfMembershipChain.id)
          .map(partial => [...initialPath, ...partial])
      )
    }
  })
  const cjsImportStrings = cjsImports.map(item => item.join('.'))
  return { cjsImports: cjsImportStrings }
}

function inspectPatternElementForPaths (child) {
  if (child.type === 'ObjectPattern') {
    return inspectObjectPatternForPaths(child)
  } else if (child.type === 'ArrayPattern') {
    return inspectArrayPatternForPaths(child)
  } else if (child.type === 'Identifier') {
    // return a single empty element, meaning "one result, the whole thing"
    return [[]]
  } else {
    throw new Error(`LavaMoat/tofu - inspectPatternElementForPaths - unable to parse element "${child.type}"`)
  }
}

function inspectObjectPatternForPaths (node) {
  // if it has computed props or a RestElement, we cant meaningfully pursue any deeper
  // so return a single empty path, meaning "one result, the whole thing"
  const expansionForbidden = node.properties.some(prop => prop.computed || prop.type === 'RestElement')
  if (expansionForbidden) return [[]]
  // expand each property into a path, recursively
  let paths = []
  node.properties.forEach(prop => {
    const propName = prop.key.name
    const child = prop.value
    paths = paths.concat(
      inspectPatternElementForPaths(child)
        .map(partial => [propName, ...partial])
    )
  })
  return paths
}

function inspectArrayPatternForPaths (node) {
  // if it has a RestElement, we cant meaningfully pursue any deeper
  // so return a single empty path, meaning "one result, the whole thing"
  const expansionForbidden = node.elements.some(el => el.type === 'RestElement')
  if (expansionForbidden) return [[]]
  // expand each property into a path, recursively
  let paths = []
  node.elements.forEach((child, propName) => {
    paths = paths.concat(
      inspectPatternElementForPaths(child)
        .map(partial => [propName, ...partial])
    )
  })
  return paths
}
