const acornGlobals = require('acorn-globals')
const standardJsGlobals = require('./standardGlobals.js')

const {
  getMemberExpressionNesting,
  getKeysForMemberExpressionChain,
  isUndefinedCheck,
  reduceToTopmostApiCalls,
  addGlobalUsage,
} = require('./util')


module.exports = inspectSource

function inspectSource (source, {
  ignoredRefs=[],
  globalRefs=[],
  languageRefs=standardJsGlobals,
} = {}) {
  const ast = acornGlobals.parse(source)
  const detectedGlobals = acornGlobals(ast)

  const globalsConfig = new Map()

  // check for global refs with member expressions
  detectedGlobals.forEach(inspectDetectedGlobalVariables)

  // reduce to remove more deep results that overlap with broader results
  // e.g. [`x.y.z`, `x.y`] can be reduced to just [`x.y`]
  reduceToTopmostApiCalls(globalsConfig)

  // prepare result
  // reducedNames.forEach(name => {
  //   globalsConfig.set(name, 'read')
  // })
  return globalsConfig

  function inspectDetectedGlobalVariables (variable) {
    const variableName = variable.name
    // skip if module global
    if (ignoredRefs.includes(variableName)) return
    // expose API as granularly as possible
    variable.nodes.forEach(identifierNode => {
      inspectIdentifierForMembershipChain(variableName, identifierNode)
    })
  }

  function inspectIdentifierForMembershipChain (variableName, identifierNode) {
    let identifierUse = 'read'
    const memberExpressions = getMemberExpressionNesting(identifierNode)
    const hasMembershipChain = Boolean(memberExpressions.length)
    // determine if used in an assignment expression
    const topmostMember = hasMembershipChain ? memberExpressions[0] : identifierNode
    const topmostMemberIndex = identifierNode.parents.indexOf(topmostMember)
    if (topmostMemberIndex < 1) {
      throw Error('unnexpected value for memberTopIndex')
    }
    const topmostMemberParentIndex = topmostMemberIndex - 1
    const parentOfMembershipChain = identifierNode.parents[topmostMemberParentIndex]
    const isAssignment = parentOfMembershipChain.type === 'AssignmentExpression'
    const isAssignmentTarget = parentOfMembershipChain.left === topmostMember
    if (isAssignment && isAssignmentTarget) {
      // this membership chain is being assigned to
      identifierUse = 'write'
    }
    // if not used in any member expressions AND is not a global ref, expose as is
    if (!hasMembershipChain) {
      // skip if global and only used for detecting presence
      // this is a bit of a hack to prevent exposing things that aren't actually used
      if (globalRefs.includes(variableName) && isUndefinedCheck(identifierNode)) return
      maybeAddGlobalUsage(variableName, identifierUse)
      return
    }
    const memberKeys = getKeysForMemberExpressionChain(memberExpressions)
    // if nested API lookup begins with a globalRef, drop it
    if (globalRefs.includes(memberKeys[0])) {
      memberKeys.shift()
    }
    // add nested API
    const path = memberKeys.join('.')
    maybeAddGlobalUsage(path, identifierUse)
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
