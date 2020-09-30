const noop = () => {}
// node -> path lookup
const pathLookup = new WeakMap()

module.exports = {
  expandUsage,
  pathLookup,
  getGraph
}

// // -> where do the inputs to function "b" come from?
// function analyzeInFlow (primaryPath) {
//   const bindingForB = primaryPath.scope.getBinding('b')
//   const firstUsageOfB = bindingForB.referencePaths[0]
//   const firstUsageOfBScopeBlock = firstUsageOfB.scope.block
//   const lineRef = `${firstUsageOfB.node.loc.start.line}:${firstUsageOfB.node.loc.start.column}`
//   const firstUsageOfBLabel = `${firstUsageOfBScopeBlock.type} ("${firstUsageOfBScopeBlock.id.name}") ${lineRef}`
//   console.log(`function "b" used at ${firstUsageOfBLabel}`)
// }

function getGraph (targetPath) {
  const nodes = new Set(); const links = []
  walkUsage(targetPath, {
    // onNode (refLink) {
    //   nodes.push()
    // },
    onLink (targetPath, refLink) {
      const originNode = targetPath.node
      const destNode = refLink.path.node
      const linkLabel = refLink.label

      // originNode._id = originNode._id || Math.random()
      // destNode._id = destNode._id || Math.random()
      nodes.add(originNode)
      nodes.add(destNode)
      links.push({ from: originNode, to: destNode, label: linkLabel })
    }
  })
  return { links, nodes: Array.from(nodes) }
}

function expandUsage (targetPath) {
  const nodes = []
  const leaves = []

  walkUsage(targetPath, { onNode, onLeaf })

  return { nodes, leaves }

  function onNode (refLink) {
    console.log('node:', refLink.label)
    nodes.push(refLink)
  }

  function onLeaf (path) {
    console.log('leaf:', path.node.type)
    leaves.push(path)
  }
}

function walkUsage (targetPath, { onNode = noop, onLeaf = noop, onLink = noop }) {
  let children
  try {
    children = tracePathToUsages(targetPath)
  } catch (err) {
    if (err.code === 'ERR_REF_OUT_OF_SCOPE') {
      onLeaf(targetPath)
      return
    }
    throw err
  }
  children.forEach(refLink => {
    onNode(refLink)
    onLink(targetPath, refLink)
    walkUsage(refLink.path, { onNode, onLeaf })
  })
}

class ReferenceLinkage {
  constructor ({ path, label }) {
    this.path = path
    this.label = label
  }
}

function makeReferenceLinkagesFromBinding (targetBinding) {
  const results = []
  targetBinding.referencePaths.forEach((ref) => {
    results.push(makeReferenceLinkageForIdentifier(ref))
  })
  return results
}

class RefOutOfScopeError extends Error {
  constructor () {
    super()
    this.code = 'ERR_REF_OUT_OF_SCOPE'
  }
}

const usageDetectors = {
  Identifier: (targetPath) => {
    switch (targetPath.parent.type) {
      case 'CallExpression': {
        if (targetPath.parentKey === 'arguments') {
          // find usage in CallExpression arguments
          const argIndex = targetPath.parent.arguments.indexOf(targetPath.node)
          const fnCallee = targetPath.parent.callee
          if (fnCallee.type === 'Identifier') {
            const fnName = targetPath.parent.callee.name
            const fnBinding = targetPath.scope.getBinding(fnName)
            const fnDeclaration = fnBinding.path.node

            // TODO: support for destructuring, defaults, spreads
            // TODO: also check usage of `arguments`
            const fnArgIdentifier = fnDeclaration.params[argIndex]
            const fnArgName = fnArgIdentifier.name
            const fnArgBinding = fnBinding.path.scope.getBinding(fnArgName)
            const fnArgPath = fnArgBinding.path

            return [
              new ReferenceLinkage({ path: fnArgPath, label: 'arg in fn dec' })
            ]
          }
          const fnCalleePath = pathLookup.get(fnCallee)
          return [
            new ReferenceLinkage({ path: fnCalleePath, label: 'arg in fn dec (unknown)' })
          ]
        }
        if (targetPath.parentKey === 'callee') {
          return usageDetectors[targetPath.parent.type](targetPath.parentPath)
        }
        throw new Error(`makeReferenceLinkageForIdentifier/CallExpression - unknown parent key "${targetPath.parentKey}"`)
      }
      case 'ReturnStatement': {
        return usageDetectors[targetPath.parent.type](targetPath.parentPath)
      }
      case 'FunctionDeclaration': {
        if (targetPath.parentKey === 'params') {
          const fnArgName = targetPath.node.name
          const fnArgBinding = targetPath.scope.getBinding(fnArgName)
          const fnArgUsages = makeReferenceLinkagesFromBinding(fnArgBinding)
          return fnArgUsages
        }
        throw new Error(`makeReferenceLinkageForIdentifier/CallExpression - unknown parent key "${targetPath.parentKey}"`)
      }
      default: {
        throw new Error(`makeReferenceLinkageForIdentifier - unknown parent type "${targetPath.parent.type}"`)
      }
    }
  },
  CallExpression: (targetPath) => {
    // usages are where the result goes, and the containing function
    const fnResultUsages = tracePathToUsages(targetPath.parentPath)
    return fnResultUsages
  },
  ReturnStatement: (targetPath) => {
    // usages are all references to this function
    const fnUsages = traceFunctionDeclarationToUsages(targetPath.scope.path)
    return fnUsages
  },
  VariableDeclarator: (targetPath) => {
    // value is being stored in a reference, track usage
    const variableName = targetPath.node.id.name
    const variableBinding = targetPath.scope.getBinding(variableName)
    const bindingUsages = makeReferenceLinkagesFromBinding(variableBinding)
    return bindingUsages
  },
  MemberExpression: (targetPath) => {
    const leftSide = targetPath.node.object
    if (leftSide.type === 'Identifier') {
      const binding = targetPath.scope.getBinding(leftSide.name)
      if (binding) {
        return new ReferenceLinkage({ path: binding.path, label: 'parent of member' })
      } else {
        throw new RefOutOfScopeError()
      }
    }
    const leftSidePath = pathLookup.get(leftSide)
    return new ReferenceLinkage({ path: leftSidePath, label: 'parent of member (unknown)' })
  }
}

function tracePathToUsages (targetPath) {
  // TODO: fold makeReferenceLinkagesFromBinding into here, create ReferenceLinkage here
  const detector = usageDetectors[targetPath.node.type]
  if (!detector) {
    throw new Error(`tracePathToUsages - Unable to parse usage of reference inside node type "${targetPath.node.type}"`)
  }
  return detector(targetPath)
}

// creates a ReferenceLinkage for node of type Identifier, with a handy contextual label
function makeReferenceLinkageForIdentifier (targetPath) {
  if (targetPath.node.type !== 'Identifier') {
    throw new Error(`makeReferenceLinkageForIdentifier - only supports type Identiter, got "${targetPath.node.type}"`)
  }
  switch (targetPath.parent.type) {
    case 'CallExpression': {
      if (targetPath.parentKey === 'arguments') {
        // value is being used directly, add to results
        return new ReferenceLinkage({ path: targetPath, label: 'args to fn' })
      }
      if (targetPath.parentKey === 'callee') {
        // value is being used directly, add to results
        return new ReferenceLinkage({ path: targetPath, label: 'called as fn' })
      }
      throw new Error(`makeReferenceLinkageForIdentifier/CallExpression - unknown parent key "${targetPath.parentKey}"`)
    }
    case 'ReturnStatement': {
      return new ReferenceLinkage({ path: targetPath, label: 'return value of fn' })
    }
    default: {
      throw new Error(`makeReferenceLinkageForIdentifier - unknown parent type "${targetPath.parent.type}"`)
    }
  }
}

function traceFunctionDeclarationToUsages (targetPath) {
  let results = []
  // check usage higher in path (a = function b(){})
  switch (targetPath.parentPath.type) {
    case 'BlockStatement': {
      // value is not being used directly, skip
      break
    }
    default: {
      throw new Error(`traceFunctionDeclarationToUsages - Unable to parse usage of reference inside node type "${targetPath.parentPath.type}"`)
    }
  }
  // check usage in scope (function b(){}; b())
  const scopeBinding = Object.values(targetPath.parentPath.scope.bindings).find(({ path }) => path === targetPath)
  if (scopeBinding) {
    const bindingUsages = makeReferenceLinkagesFromBinding(scopeBinding)
    results = [...results, ...bindingUsages]
  }
  return results
}
