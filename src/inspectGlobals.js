const acornGlobals = require('acorn-globals')
const whitelist = require('./sesWhitelist').buildWhitelist()
const moduleScope = [
  // commonjs basics
  'module',
  'exports',
  'require',
  // browserify
  'global',
  // used for extra module features (usually module override via browser field)
  'arguments',
  // common in UMD builds
  'define',
  'this',
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
  const result = acornGlobals(ast)

  const filteredResults = result.filter((variable) => {
    const variableName = variable.name
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