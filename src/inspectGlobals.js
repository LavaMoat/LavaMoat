const acornGlobals = require('acorn-globals')
const whitelist = require('./sesWhitelist').buildWhitelist()
const moduleScope = [
  // commonjs basics
  'module',
  'exports',
  'require',
  // used for extra module features (usually module override via browser field)
  'arguments',
  // common in UMD builds
  'define',
  'this',
]

const globalRefs = [
  'global',
  'window',
  'self',
]

const ignoredGlobals = [
  // we handle this elsewhere
  'global',
]

const browserPlatformGlobals = [
  // surely harmless
  'console',
  'btoa',
  'atob',
  'eval',
  // global refs
  'window',
  'self',
  // timing
  'setTimeout',
  'clearTimeout',
  'clearInterval',
  'setInterval',
  'cancelAnimationFrame',
  'requestAnimationFrame',
  // browser APIs
  'location',
  'screen',
  'navigator',
  'performance',
  'document',
  'fetch',
  'XMLHttpRequest',
  'crypto',
  'msCrypto',
  'name',
  'chrome',
  'MSApp',
  'browser',
  'Intl',
  'getComputedStyle',
  'history',
  'localStorage',
  'postMessage',
  // browser classes
  'AudioContext',
  'AudioNode',
  'AudioBufferSourceNode',
  'OfflineAudioContext',
  'OscillatorNode',
  'DOMError',
  'DOMException',
  'ErrorEvent',
  'Headers',
  'Request',
  'Response',
  'TextDecoder',
  'TextEncoder',
  'MutationObserver',
  'PromiseRejectionEvent',
  'DOMParser',
  'Image',
  'SVGElement',
  'MediaStreamTrack',
  'RTCIceGatherer',
  'mozRTCPeerConnection',
  'webkitMediaStream',
  'webkitRTCPeerConnection',
  'FileReader',
  'FormData',
  'URLSearchParams',
  'WebSocket',
  'Worker',
  'RTCSessionDescription',
  'Node',
  'ActiveXObject',
  'DocumentTouch',
  'Element',
  'Event',
  'Blob',
  'SVGPathElement',
  'SVGPathSeg',
  'SVGPathSegArcAbs',
  'SVGPathSegArcRel',
  'SVGPathSegClosePath',
  'SVGPathSegCurvetoCubicAbs',
  'SVGPathSegCurvetoCubicRel',
  'SVGPathSegCurvetoCubicSmoothAbs',
  'SVGPathSegCurvetoCubicSmoothRel',
  'SVGPathSegCurvetoQuadraticAbs',
  'SVGPathSegCurvetoQuadraticRel',
  'SVGPathSegCurvetoQuadraticSmoothAbs',
  'SVGPathSegCurvetoQuadraticSmoothRel',
  'SVGPathSegLinetoAbs',
  'SVGPathSegLinetoHorizontalAbs',
  'SVGPathSegLinetoHorizontalRel',
  'SVGPathSegLinetoRel',
  'SVGPathSegLinetoVerticalAbs',
  'SVGPathSegLinetoVerticalRel',
  'SVGPathSegList',
  'SVGPathSegMovetoAbs',
  'SVGPathSegMovetoRel',
  'File',
  'InstallTrigger',
  'MSStream',
  'MediaStream', 
  'RTCPeerConnection', 
  // etc
  'addEventListener',
  'removeEventListener',
  'confirm',
  'dispatchEvent',
  'mozInnerScreenX',
  'mozInnerScreenY',
  'mozRequestAnimationFrame',
  'msPerformance',
  'msRequestAnimationFrame',
  'oRequestAnimationFrame',
  'opera',
  'webkitPerformance',
  'webkitRequestAnimationFrame',
  'webkitRequestFileSystem',
  'getSelection',
  'indexedDB',
  'innerHeight',
  'innerWidth',
  'onresize',
  'open',
  'pageXOffset',
  'pageYOffset',
  'prompt',
  'scrollBy',
  'scrollX',
  'scrollY',
  'top',
  'MessageChannel',
]

module.exports = inspectGlobals


function inspectGlobals (code, debugLabel) {
  const ast = acornGlobals.parse(code)
  const detectedGlobals = acornGlobals(ast)
  const globalNames = []

  // check for global refs with member expressions
  detectedGlobals.forEach(variable => {
    const variableName = variable.name
    // skip if module global
    if (moduleScope.includes(variableName)) return
    // expose API as granularly as possible
    variable.nodes.forEach(identifierNode => {
      const memberExpressions = getMemberExpressionNesting(identifierNode)
      // if not used in any member expressions AND is not a global ref, expose as is
      if (!memberExpressions.length) {
        // skip if global and only used for detecting presence 
        if (globalRefs.includes(variableName) && isUndefinedCheck(identifierNode)) return
        maybeAddGlobalName(variableName)
        return
      }
      const memberKeys = getKeysForMemberExpressionChain(memberExpressions)
      // if nested API lookup begins with a globalRef, drop it
      if (globalRefs.includes(memberKeys[0])) {
        memberKeys.shift()
      }
      // add nested API
      const nestedName = memberKeys.join('.')
      maybeAddGlobalName(nestedName)
    })
  })

  // we sort to provide a more deterministic result
  return globalNames.sort()

  function maybeAddGlobalName (variableName, debugLabel) {
    const apiRoot = variableName.split('.')[0]
    // ignore if in SES's whitelist (safe JS features)
    const whitelistStatus = whitelist[apiRoot]
    if (whitelistStatus) {
      // skip if exactly true (fully whitelisted)
      if (whitelistStatus === true) return
      // skip if '*' (whitelisted but checks inheritance(?))
      if (whitelistStatus === '*') return
      // inspect if partial whitelist
      if (typeof whitelistStatus === 'object') return
    }
    // skip ignored globals
    if (ignoredGlobals.includes(apiRoot)) return
    // ignore unknown non-platform globals
    if (!browserPlatformGlobals.includes(apiRoot)) {
      // console.warn(`!! IGNORING GLOBAL "${apiRoot}" from "${debugLabel || ''}"`)
      return
    }
    // add variable to results
    globalNames.push(variableName)
  }
  
}

function getMemberExpressionNesting (identifierNode) {
  const parents = identifierNode.parents.slice(0,-1)
  const memberExpressions = getTailmostMatchingChain(parents, isDirectMemberExpression).reverse()
  return memberExpressions
}

function getKeysForMemberExpressionChain (memberExpressions) {
  const keys = memberExpressions.map(member => member.property.name)
  const rootMemberExpression = memberExpressions[0]
  const rootName = rootMemberExpression.object.name
  keys.unshift(rootName)
  return keys
}

function isDirectMemberExpression (node) {
  return node.type === 'MemberExpression' && !node.computed
}

function isUndefinedCheck (identifierNode) {
  const parentExpression = identifierNode.parents[identifierNode.parents.length - 2]
  const isTypeof = (parentExpression.type === 'UnaryExpression' || parentExpression.operator === 'typeof')
  return isTypeof
}

function getTailmostMatchingChain (items, matcher) {
  const onlyMatched = items.map(item => matcher(item) ? item : null)
  const lastIndex = onlyMatched.lastIndexOf(null)
  if (lastIndex === -1) return onlyMatched.slice()
  return onlyMatched.slice(lastIndex + 1)
}

function removeFromArray (array, entry) {
  const index = array.indexOf(entry)
  if (index === -1) return
  array.splice(index, 1)
}