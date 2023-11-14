const noop = () => {}
// node -> path lookup
const pathLookup = new WeakMap()

module.exports = {
  expandUsage,
  pathLookup,
  getGraph,
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

/**
 * @typedef Link
 * @property {import('@babel/types').Node} from
 * @property {import('@babel/types').Node} to
 * @property {string} label
 */

/**
 *
 * @param {import('@babel/traverse').NodePath<import('@babel/types').Node>} targetPath
 * @returns
 */
function getGraph(targetPath) {
  const nodes = new Set()
  /** @type {Link[]} */
  const links = []
  walkUsage(targetPath, {
    // onNode (refLink) {
    //   nodes.push()
    // },
    /**
     *
     * @param {import('@babel/traverse').NodePath<import('@babel/types').Node>} targetPath
     * @param {*} refLink
     */
    onLink(targetPath, refLink) {
      const originNode = targetPath.node
      const destNode = refLink.path.node
      const linkLabel = refLink.label

      // originNode._id = originNode._id || Math.random()
      // destNode._id = destNode._id || Math.random()
      nodes.add(originNode)
      nodes.add(destNode)
      links.push({ from: originNode, to: destNode, label: linkLabel })
    },
  })
  return { links, nodes: Array.from(nodes) }
}

/**
 *
 * @param {import('@babel/traverse').NodePath<import('@babel/types').Node>} targetPath
 * @returns
 */
function expandUsage(targetPath) {
  /**
   * @type {ReferenceLinkage[]}
   */
  const nodes = []
  /** @type {import('@babel/traverse').NodePath<import('@babel/types').Node>[]} */
  const leaves = []

  walkUsage(targetPath, { onNode, onLeaf })

  return { nodes, leaves }

  /**
   * @param {ReferenceLinkage} refLink
   */
  function onNode(refLink) {
    console.log('node:', refLink.label)
    nodes.push(refLink)
  }

  /**
   * @param {import('@babel/traverse').NodePath<import('@babel/types').Node>} path
   */
  function onLeaf(path) {
    console.log('leaf:', path.node.type)
    leaves.push(path)
  }
}

/**
 * @typedef WalkUsageOptions
 * @property {(refLink: ReferenceLinkage) => void} onNode
 * @property {(path: import('@babel/traverse').NodePath<import('@babel/types').Node>) => void} onLeaf
 * @property {(originPath: import('@babel/traverse').NodePath<import('@babel/types').Node>, refLink: ReferenceLinkage) => void} onLink
 */

/**
 *
 * @param {import('@babel/traverse').NodePath<import('@babel/types').Node>} targetPath
 * @param {*} param1
 * @returns
 */
function walkUsage(
  targetPath,
  { onNode = noop, onLeaf = noop, onLink = noop }
) {
  /** @type {ReferenceLinkage[]} */
  let children
  try {
    children = tracePathToUsages(targetPath)
  } catch (err) {
    if (RefOutOfScopeError.isRefOutOfScopeError(err)) {
      onLeaf(targetPath)
      return
    }
    throw err
  }
  children.forEach((refLink) => {
    onNode(refLink)
    onLink(targetPath, refLink)
    walkUsage(refLink.path, { onNode, onLeaf })
  })
}

class ReferenceLinkage {
  /**
   *
   * @param {{path: import('@babel/traverse').NodePath, label: string}} param0
   */
  constructor({ path, label }) {
    this.path = path
    this.label = label
  }
}

/**
 *
 * @param {import('@babel/traverse').Binding} [targetBinding]
 * @returns {ReferenceLinkage[]}
 */
function makeReferenceLinkagesFromBinding(targetBinding) {
  /** @type {ReferenceLinkage[]} */
  const results = []
  targetBinding?.referencePaths.forEach((ref) => {
    results.push(makeReferenceLinkageForIdentifier(ref))
  })
  return results
}

class RefOutOfScopeError extends Error {
  constructor() {
    super()
    this.code = RefOutOfScopeError.code
  }

  /**
   * @param {unknown} err
   * @returns {err is RefOutOfScopeError}
   */
  static isRefOutOfScopeError(err) {
    return Boolean(
      err &&
        (err instanceof RefOutOfScopeError ||
          (typeof err === 'object' &&
            'code' in err &&
            err.code === RefOutOfScopeError.code))
    )
  }
}
RefOutOfScopeError.code = 'ERR_REF_OUT_OF_SCOPE'

/**
 * @typedef {import('@babel/types').CallExpression|import('@babel/types').Identifier|import('@babel/types').ReturnStatement|import('@babel/types').VariableDeclarator|import('@babel/types').MemberExpression} DetectableNode
 */

/**
 * @template {DetectableNode} T
 * @typedef {(targetPath: import('@babel/traverse').NodePath<T>) => ReferenceLinkage[]} Detector
 */

/**
 * @template {DetectableNode} [T=DetectableNode]
 * @typedef {import('@babel/traverse').NodePath<T>} DetectableNodePath
 */

const usageDetectors = {
  /**
   * @type {Detector<import('@babel/types').Identifier>}
   */
  Identifier: (targetPath) => {
    switch (targetPath.parent.type) {
      case 'CallExpression': {
        if (targetPath.parentKey === 'arguments') {
          // find usage in CallExpression arguments
          const argIndex = targetPath.parent.arguments.indexOf(targetPath.node)
          const fnCallee = targetPath.parent.callee
          if (fnCallee.type === 'Identifier') {
            if ('name' in targetPath.parent.callee) {
              const fnName = targetPath.parent.callee.name
              const fnBinding = targetPath.scope.getBinding(fnName)
              if (fnBinding?.path.isFunctionDeclaration()) {
                const fnDeclaration = fnBinding.path.node

                // TODO: support for destructuring, defaults, spreads
                // TODO: also check usage of `arguments`
                const fnArgIdentifier = fnDeclaration.params[argIndex]
                if ('name' in fnArgIdentifier) {
                  const fnArgName = fnArgIdentifier.name
                  const fnArgBinding =
                    fnBinding.path.scope.getBinding(fnArgName)
                  if (fnArgBinding) {
                    const fnArgPath = fnArgBinding.path

                    return [
                      new ReferenceLinkage({
                        path: fnArgPath,
                        label: 'arg in fn dec',
                      }),
                    ]
                  }
                }
              }
            }
          }
          const fnCalleePath = pathLookup.get(fnCallee)
          return [
            new ReferenceLinkage({
              path: fnCalleePath,
              label: 'arg in fn dec (unknown)',
            }),
          ]
        }
        if (
          targetPath.parentPath.isCallExpression() &&
          targetPath.parentKey === 'callee'
        ) {
          return usageDetectors[targetPath.parent.type](targetPath.parentPath)
        }
        throw new Error(
          `makeReferenceLinkageForIdentifier/CallExpression - unknown parent key "${targetPath.parentKey}"`
        )
      }
      case 'ReturnStatement': {
        return usageDetectors[targetPath.parent.type](
          /** @type {import('@babel/traverse').NodePath<import('@babel/types').ReturnStatement>} */ (
            targetPath.parentPath
          )
        )
      }
      case 'FunctionDeclaration': {
        if (targetPath.parentKey === 'params') {
          const fnArgName = targetPath.node.name
          const fnArgBinding = targetPath.scope.getBinding(fnArgName)
          const fnArgUsages = makeReferenceLinkagesFromBinding(fnArgBinding)
          return fnArgUsages
        }
        throw new Error(
          `makeReferenceLinkageForIdentifier/CallExpression - unknown parent key "${targetPath.parentKey}"`
        )
      }
      default: {
        throw new Error(
          `makeReferenceLinkageForIdentifier - unknown parent type "${targetPath.parent.type}"`
        )
      }
    }
  },
  /**
   * @type {Detector<import('@babel/types').CallExpression>}
   */
  CallExpression: (targetPath) => {
    // usages are where the result goes, and the containing function
    const fnResultUsages = tracePathToUsages(targetPath.parentPath)
    return fnResultUsages
  },
  /**
   * @type {Detector<import('@babel/types').ReturnStatement>}
   */
  ReturnStatement: (targetPath) => {
    // usages are all references to this function
    const fnUsages = traceFunctionDeclarationToUsages(targetPath.scope.path)
    return fnUsages
  },
  /**
   * @type {Detector<import('@babel/types').VariableDeclarator>}
   */
  VariableDeclarator: (targetPath) => {
    // value is being stored in a reference, track usage
    if ('name' in targetPath.node.id) {
      const variableName = targetPath.node.id.name
      const variableBinding = targetPath.scope.getBinding(variableName)
      const bindingUsages = makeReferenceLinkagesFromBinding(variableBinding)
      return bindingUsages
    }
    return []
  },
  /**
   * @type {Detector<import('@babel/types').MemberExpression>}
   */
  MemberExpression: (targetPath) => {
    const leftSide = targetPath.node.object
    if (leftSide.type === 'Identifier') {
      const binding = targetPath.scope.getBinding(leftSide.name)
      if (binding) {
        // @ts-ignore - FIXME needs logic changes for type safety
        return new ReferenceLinkage({
          path: binding.path,
          label: 'parent of member',
        })
      } else {
        throw new RefOutOfScopeError()
      }
    }
    const leftSidePath = pathLookup.get(leftSide)
    // @ts-ignore - FIXME needs logic changes for type safety
    return new ReferenceLinkage({
      path: leftSidePath,
      label: 'parent of member (unknown)',
    })
  },
}

/**
 * @template {import('@babel/types').Node} T
 * @param {import('@babel/traverse').NodePath<T>} path
 * @returns {path is DetectableNodePath<infer U>}
 */
function isDetectableNodePath(path) {
  return path.node.type in usageDetectors
}

/**
 * @param {import('@babel/traverse').NodePath} targetPath
 * @returns {ReferenceLinkage[]}
 */
function tracePathToUsages(targetPath) {
  if (!targetPath) {
    throw new Error('tracePathToUsages - targetPath is null')
  }
  // TODO: fold makeReferenceLinkagesFromBinding into here, create ReferenceLinkage here
  if (isDetectableNodePath(targetPath)) {
    const detector = /** @type {Detector<typeof targetPath.node>} */ (
      usageDetectors[targetPath.node.type]
    )

    return detector(targetPath)
  }
  throw new Error(
    `tracePathToUsages - Unable to parse usage of reference inside node type "${targetPath.node.type}"`
  )
}

/**
 *
 * @param {import('@babel/traverse').NodePath<import('@babel/types').Node>} targetPath
 * @returns {ReferenceLinkage}
 */
// creates a ReferenceLinkage for node of type Identifier, with a handy contextual label
function makeReferenceLinkageForIdentifier(targetPath) {
  if (targetPath.node.type !== 'Identifier') {
    throw new Error(
      `makeReferenceLinkageForIdentifier - only supports type Identiter, got "${targetPath.node.type}"`
    )
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
      throw new Error(
        `makeReferenceLinkageForIdentifier/CallExpression - unknown parent key "${targetPath.parentKey}"`
      )
    }
    case 'ReturnStatement': {
      return new ReferenceLinkage({
        path: targetPath,
        label: 'return value of fn',
      })
    }
    default: {
      throw new Error(
        `makeReferenceLinkageForIdentifier - unknown parent type "${targetPath.parent.type}"`
      )
    }
  }
}

/**
 *
 * @param {import('@babel/traverse').NodePath<import('@babel/types').Node>} targetPath
 * @returns
 */
function traceFunctionDeclarationToUsages(targetPath) {
  /** @type {ReferenceLinkage[]} */
  let results = []
  // check usage higher in path (a = function b(){})
  switch (targetPath.parentPath?.type) {
    case 'BlockStatement': {
      // value is not being used directly, skip
      break
    }
    default: {
      throw new Error(
        `traceFunctionDeclarationToUsages - Unable to parse usage of reference inside node type "${targetPath.parentPath?.type}"`
      )
    }
  }
  // check usage in scope (function b(){}; b())
  const scopeBinding = Object.values(targetPath.parentPath.scope.bindings).find(
    ({ path }) => path === targetPath
  )
  if (scopeBinding) {
    const bindingUsages = makeReferenceLinkagesFromBinding(scopeBinding)
    results = [...results, ...bindingUsages]
  }
  return results
}
