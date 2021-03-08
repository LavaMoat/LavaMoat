const { parse } = require('@babel/parser')
const { default: traverse } = require('@babel/traverse')
const { findGlobals } = require('./findGlobals')
const { globalPropertyNames: defaultGlobalPropertyNames, languageRefs: defaultLanguageRefs } = require('./primordials.js')

const {
  getMemberExpressionNesting,
  getPathFromMemberExpressionChain,
  reduceToTopmostApiCalls,
  addGlobalUsage,
  getParents
} = require('./util')

module.exports = {
  inspectGlobals,
  inspectImports,
  inspectEsmImports,
  inspectDynamicRequires
}

function inspectGlobals (source, {
  ignoredRefs = [],
  globalRefs = [],
  globalPropertyNames = defaultGlobalPropertyNames,
  languageRefs = defaultLanguageRefs
} = {}) {
  const ast = (typeof source === 'object') ? source : parse(source)
  const detectedGlobals = findGlobals(ast)

  const globalsConfig = new Map()
  // check for global refs with member expressions
  ;[...detectedGlobals.entries()].forEach(([name, paths]) => inspectDetectedGlobalVariables(name, paths))
  // reduce to remove more deep results that overlap with broader results
  // e.g. [`x.y.z`, `x.y`] can be reduced to just [`x.y`]
  reduceToTopmostApiCalls(globalsConfig)

  return globalsConfig

  function inspectDetectedGlobalVariables (name, paths) {
    // skip if module global
    if (ignoredRefs.includes(name)) return
    // expose API as granularly as possible
    paths.forEach(path => {
      const parents = getParents(path)
      const { path: keyPath, identifierUse, parent } = inspectIdentifierForDirectMembershipChain(name, path.node, parents)
      // if nested API lookup begins with a globalRef, drop it
      if (globalRefs.includes(keyPath[0])) {
        keyPath.shift()
      }
      // inspect for destructuring
      let destructuredPaths
      if (parent.type === 'VariableDeclarator' && ['ObjectPattern', 'ArrayPattern'].includes(parent.id.type)) {
        destructuredPaths = (
          inspectPatternElementForKeys(parent.id)
            .map(partial => [...keyPath, ...partial])
        )
      } else {
        destructuredPaths = [keyPath]
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

  function inspectIdentifierForDirectMembershipChain (variableName, identifierNode, parents) {
    let identifierUse = 'read'
    const { memberExpressions, parentOfMembershipChain, topmostMember } = getMemberExpressionNesting(identifierNode, parents)
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
    // skip intrinsics and other language features
    if (globalPropertyNames.includes(topmostRef)) return
    if (languageRefs.includes(topmostRef)) return
    // skip ignored globals
    if (ignoredRefs.includes(topmostRef)) return
    addGlobalUsage(globalsConfig, identifierPath, identifierUse)
  }
}

function inspectEsmImports (ast, packagesToInspect) {
  const esmImports = []
  traverse(ast, {
    ImportDeclaration: (path) => {
      const { node } = path
      const { specifiers, source } = node
      // not sure if this is ever not a StringLiteral, but just in case
      if (source.type !== 'StringLiteral') return
      const importSource = source.value
      specifiers.forEach(spec => {
        switch (spec.type) {
          case 'ImportDefaultSpecifier': {
            const importName = importSource
            esmImports.push(importName)
            return
          }
          case 'ImportNamespaceSpecifier': {
            const importName = importSource
            esmImports.push(importName)
            return
          }
          case 'ImportSpecifier': {
            const importName = `${importSource}.${spec.imported.name}`
            esmImports.push(importName)
            return
          }
          default: {
            throw new Error(`inspectEsmImports - unknown import specifier type "${spec.type}"`)
          }
        }
      })
    }
  })
  return { esmImports }
}

function findAllCallsToRequire (ast) {
  const matches = []
  traverse(ast, {
    CallExpression: function (path) {
      const { node } = path
      const { callee } = node
      if (callee.type !== 'Identifier') return
      if (callee.name !== 'require') return
      // ensure this is the global "require" method
      if (path.scope.hasBinding('require', true)) return
      matches.push(path)
    }
  })
  return matches
}

function inspectDynamicRequires (ast) {
  const requireCalls = findAllCallsToRequire(ast)
  const dynamicRequireCalls = requireCalls.filter(path => {
    const { node } = path
    const { arguments: [moduleNameNode] } = node
    // keep invalid no-argument require calls
    if (!moduleNameNode) return true
    // skip normal require(string) calls
    if (moduleNameNode.type === 'StringLiteral') return false
    // keep any other type
    return true
  })
  return dynamicRequireCalls
}

function inspectImports (ast, packagesToInspect, deep = true) {
  const cjsImports = []
  const requireCalls = findAllCallsToRequire(ast)
  requireCalls.forEach(path => {
    const { node } = path
    const { arguments: [moduleNameNode] } = node
    // skip invalid or dynamic require calls
    if (!moduleNameNode || moduleNameNode.type !== 'StringLiteral') return
    // skip if not specified in "packagesToInspect"
    const moduleName = moduleNameNode.value
    if (packagesToInspect && !packagesToInspect.includes(moduleName)) return
    // if not deep, done
    if (!deep) {
      cjsImports.push([moduleName])
      return
    }
    // inspect for member chain
    // eg:  require("abc").xyz
    const parents = getParents(path)
    const { memberExpressions, parentOfMembershipChain } = getMemberExpressionNesting(node, parents)
    const initialKeyPath = [moduleName, ...getPathFromMemberExpressionChain(memberExpressions)]
    // if import not used in a var declaration, exit early
    if (parentOfMembershipChain.type !== 'VariableDeclarator') {
      // result of require has not been assigned, it has been consumed
      cjsImports.push(initialKeyPath)
      return
    }
    // get all declared vars (destructuring)
    // for each declared var, detect usage keyPath
    // eg:  const { ijk } = require("abc").xyz
    const identifierOrPattern = parentOfMembershipChain.id
    const declaredVars = inspectPatternElementForDeclarations(identifierOrPattern, initialKeyPath)
    declaredVars.forEach(({ node, keyPath }) => {
      const varName = node.name
      const refs = path.scope.getBinding(varName).referencePaths
      // if the var is not used anywhere, still whitelist it so the require call doesnt fail
      if (!refs.length) {
        // add to results
        cjsImports.push(keyPath)
        return
      }
      // for each reference of the var, detect usage keyPath
      refs.forEach((refPath) => {
        const parents = getParents(refPath)
        const { memberExpressions } = getMemberExpressionNesting(refPath.node, parents)
        const subPath = getPathFromMemberExpressionChain(memberExpressions)
        const usageKeyPath = [...keyPath, ...subPath]
        // add to results
        cjsImports.push(usageKeyPath)
      })
    })
  })
  // stringify paths
  let cjsImportStrings = cjsImports.map(item => item.join('.'))
  // get unique results
  cjsImportStrings = Array.from(new Set(cjsImportStrings))
  return { cjsImports: cjsImportStrings }
}

function inspectPatternElementForDeclarations (node, keyPath = []) {
  if (node.type === 'ObjectPattern') {
    return inspectObjectPatternForDeclarations(node, keyPath)
  } else if (node.type === 'ArrayPattern') {
    return inspectArrayPatternForDeclarations(node, keyPath)
  } else if (node.type === 'Identifier') {
    // done, return the node with the current path
    return [{ node, keyPath }]
  } else if (node.type === 'AssignmentPattern') {
    // AssignmentPattern is for provided a fallback value in a destructuring pattern
    return [{ node: node.left, keyPath }]
  } else {
    throw new Error(`LavaMoat/tofu - inspectPatternElementForDeclarations - unable to parse element "${node.type}"`)
  }
}

function inspectObjectPatternForDeclarations (node, keyPath) {
  // if it has computed props or a RestElement, we cant meaningfully pursue any deeper
  // return the node with the current path
  const expansionForbidden = node.properties.some(prop => prop.computed || prop.type === 'RestElement')
  if (expansionForbidden) return [{ node, keyPath }]
  // expand each property into a path, recursively
  let results = []
  node.properties.forEach(prop => {
    const propName = prop.key.name
    const child = prop.value
    results = results.concat(
      inspectPatternElementForDeclarations(child, [...keyPath, propName])
    )
  })
  return results
}

function inspectArrayPatternForDeclarations (node, keyPath) {
  // if it has a RestElement, we cant meaningfully pursue any deeper
  // return the node with the current path
  const expansionForbidden = node.elements.some(el => el.type === 'RestElement')
  if (expansionForbidden) return [{ node, keyPath }]
  // expand each property into a path, recursively
  let results = []
  node.elements.forEach((child, propName) => {
    results = results.concat(
      inspectPatternElementForDeclarations(child, [...keyPath, propName])
    )
  })
  return results
}

function inspectPatternElementForKeys (child) {
  if (child.type === 'ObjectPattern') {
    return inspectObjectPatternForKeys(child)
  } else if (child.type === 'ArrayPattern') {
    return inspectArrayPatternForKeys(child)
  } else if (child.type === 'Identifier') {
    // return a single empty element, meaning "one result, the whole thing"
    return [[]]
  } else if (child.type === 'AssignmentPattern') {
    // equivalent to hitting an Identifier
    return [[]]
  } else {
    throw new Error(`LavaMoat/tofu - inspectPatternElementForKeys - unable to parse element "${child.type}"`)
  }
}

function inspectObjectPatternForKeys (node) {
  // if it has computed props or a RestElement, we cant meaningfully pursue any deeper
  // so return a single empty path, meaning "one result, the whole thing"
  const expansionForbidden = node.properties.some(prop => prop.computed || prop.type === 'RestElement')
  if (expansionForbidden) return [[]]
  // expand each property into a path, recursively
  let keys = []
  node.properties.forEach(prop => {
    const propName = prop.key.name
    const child = prop.value
    keys = keys.concat(
      inspectPatternElementForKeys(child)
        .map(partial => [propName, ...partial])
    )
  })
  return keys
}

function inspectArrayPatternForKeys (node) {
  // if it has a RestElement, we cant meaningfully pursue any deeper
  // so return a single empty path, meaning "one result, the whole thing"
  const expansionForbidden = node.elements.some(el => el.type === 'RestElement')
  if (expansionForbidden) return [[]]
  // expand each property into a path, recursively
  let keys = []
  node.elements.forEach((child, propName) => {
    keys = keys.concat(
      inspectPatternElementForKeys(child)
        .map(partial => [propName, ...partial])
    )
  })
  return keys
}
