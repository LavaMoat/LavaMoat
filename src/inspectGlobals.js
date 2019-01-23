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
  const results = acornGlobals(ast)
  const globalNames = []

  // check for global refs with member expressions
  results.forEach(variable => {
    const variableName = variable.name
    // skip if module global
    if (moduleScope.includes(variableName)) return

    // if not a global ref, add as is
    if (!globalRefs.includes(variableName)) {
      maybeAddGlobalName(variableName, debugLabel)
      return
    }

    // if global, check for MemberExpression
    variable.nodes.forEach(identifierNode => {
      const maybeMemberExpression = identifierNode.parents[identifierNode.parents.length - 2]
      // if not part of a member expression, ignore
      // this could break things but usually its just checking if we're in the browser
      if (!maybeMemberExpression || maybeMemberExpression.type !== 'MemberExpression') {
        // maybeAddGlobalName(variableName)
        return
      }
      const propertyNode = maybeMemberExpression.property
      // if a computed lookup, keep global
      if (maybeMemberExpression.computed) {
        maybeAddGlobalName(variableName)
        return
      }
      // add property to results
      maybeAddGlobalName(propertyNode.name, debugLabel)
    })
  })

  function maybeAddGlobalName (variableName, debugLabel) {
    // ignore if in SES's whitelist (safe JS features)
    const whitelistStatus = whitelist[variableName]
    if (whitelistStatus) {
      // skip if exactly true (fully whitelisted)
      if (whitelistStatus === true) return
      // skip if '*' (whitelisted but checks inheritance(?))
      if (whitelistStatus === '*') return
      // inspect if partial whitelist
      if (typeof whitelistStatus === 'object') return
    }
    // skip ignored globals
    if (ignoredGlobals.includes(variableName)) return
    // ignore unknown non-platform globals
    if (!browserPlatformGlobals.includes(variableName)) {
      console.warn(`!! IGNORING GLOBAL "${variableName}" from "${debugLabel || ''}"`)
      return
    }
    // add variable to results
    globalNames.push(variableName)
  }
  
  return globalNames
}

function removeFromArray (array, entry) {
  const index = array.indexOf(entry)
  if (index === -1) return
  array.splice(index, 1)
}