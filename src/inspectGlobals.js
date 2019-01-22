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
]

module.exports = inspectGlobals


function inspectGlobals (code, debugLabel) {
  const ast = acornGlobals.parse(code)
  const results = acornGlobals(ast)

  // check for global refs with member expressions
  results.forEach(variable => {
    // do nothing if not a global ref
    if (!globalRefs.includes(variable.name)) return
    // if global, check for MemberExpression
    variable.nodes.forEach(identifierNode => {
      const maybeMemberExpression = identifierNode.parents[identifierNode.parents.length - 2]
      if (!maybeMemberExpression || maybeMemberExpression.type !== 'MemberExpression') return
      // add to potential results
      results.push(maybeMemberExpression.property)
    })
  })

  const filteredResults = results.filter((variable) => {
    const variableName = variable.name
    // skip if a global ref
    if (globalRefs.includes(variableName)) return false
    // skip if module global
    if (moduleScope.includes(variableName)) return false
    // check if in SES's whitelist
    const whitelistStatus = whitelist[variableName]
    if (whitelistStatus) {
      // skip if exactly true (fully whitelisted)
      if (whitelistStatus === true) return false
      // skip if '*' (whitelisted but checks inheritance(?))
      if (whitelistStatus === '*') return false
      // inspect if partial whitelist
      if (typeof whitelistStatus === 'object') return false
    }

    // only recognize platform globals
    if (browserPlatformGlobals.includes(variableName)) {
      return true
    }

    /// ignore non-standard globals
    console.log(`!! ${variableName} ${debugLabel}`)
    return false
  })
  
  return filteredResults
}