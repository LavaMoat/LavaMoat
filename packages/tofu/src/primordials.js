// taken from ses's lists
// https://github.com/Agoric/SES-shim/blob/842cef46891bda69c0022cf66b05c85a7c7c77b2/packages/make-simple-evaluate/src/main.js#L2-L64
// https://github.com/Agoric/SES-shim/blob/299abe011e8aac273583c983216ca8248aa73b51/packages/ses/src/whitelist.js#L18-L96

module.exports.globalPropertyNames = [

  // *** 18.2 Function Properties of the Global Object

  'eval',
  'isFinite',
  'isNaN',
  'parseFloat',
  'parseInt',

  'decodeURI',
  'decodeURIComponent',
  'encodeURI',
  'encodeURIComponent',

  // *** 18.3 Constructor Properties of the Global Object

  'Array',
  'ArrayBuffer',
  'Boolean',
  'DataView',
  'Date',
  'Error',
  'EvalError',
  'Float32Array',
  'Float64Array',
  'Function',
  'Int8Array',
  'Int16Array',
  'Int32Array',
  'Map',
  'Number',
  'Object',
  'Promise',
  'Proxy',
  'RangeError',
  'ReferenceError',
  'RegExp',
  'Set',
  'SharedArrayBuffer',
  'String',
  'Symbol',
  'SyntaxError',
  'TypeError',
  'Uint8Array',
  'Uint8ClampedArray',
  'Uint16Array',
  'Uint32Array',
  'URIError',
  'WeakMap',
  'WeakSet',

  // *** 18.4 Other Properties of the Global Object

  'Atomics',
  'JSON',
  'Math',
  'Reflect',

  // *** Annex B

  'escape',
  'unescape',

  // found to be missing from this list
  'BigInt',
  'BigInt64Array',
  'BigUint64Array',
  'NaN',
  'Infinity'
]

// js language keywords that are not global properties
module.exports.languageRefs = ['this', 'arguments', 'undefined']
