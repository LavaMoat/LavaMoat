/**
 * @typedef {object} ScuttleOpts
 * @property {boolean} enabled - Whether scuttling is enabled or not.
 * @property {Array<string|RegExp>} exceptions - List of properties to exclude from scuttling.
 * @property {string} scuttlerName - Name of the scuttler function to use which is expected to be found as a
 * property on the global object (e.g. if scuttlerName is 'x', scuttler function is obtained from globalThis['x']).
 */

/**
 * @typedef {object} GlobalRef
 * @property {Record<string, any>} [globalThis] - Reference to the global object.
 */

const { Object, Array, Error, RegExp, Set, console, Proxy, Reflect } =
  globalThis

const {
  assign,
  getOwnPropertyNames,
  getOwnPropertyDescriptor,
  create,
  defineProperty,
} = Object

const { isArray, from } = Array

const { getPrototypeOf } = Reflect

const { warn } = console

function generateInvokers(prop) {
  return { get, set }
  function set() {
    warn(
      `LavaMoat - property "${prop}" of globalThis cannot be set under scuttling mode. ` +
        'To learn more visit https://github.com/LavaMoat/LavaMoat/pull/360.'
    )
  }
  function get() {
    throw new Error(
      `LavaMoat - property "${prop}" of globalThis is inaccessible under scuttling mode. ` +
        'To learn more visit https://github.com/LavaMoat/LavaMoat/pull/360.'
    )
  }
}

/**
 * Applies scuttling, with the default set of options, including using Snow if passed in as scuttlerFunc.
 * Scuttle globalThis right after we used it to create the root package compartment.
 *
 * @param {GlobalRef} globalRef - Reference to the global object.
 * @param {ScuttleOpts} opts - Scuttling options.
 */
function scuttle(globalRef, opts) {
  const scuttleOpts = generateScuttleOpts(globalRef, opts)

  if (scuttleOpts.enabled) {
    if (!isArray(scuttleOpts.exceptions)) {
      throw new Error(
        `LavaMoat - exceptions must be an array, got ${typeof scuttleOpts.exceptions}`
      )
    }
    scuttleOpts.scuttlerFunc(globalRef, (realm) =>
      performScuttleGlobalThis(realm, scuttleOpts.exceptions)
    )
  }
}

/**
 * @param {GlobalRef} globalRef - Reference to the global object.
 * @param {ScuttleOpts|boolean} originalOpts - Scuttling options. Accepts `true` for backwards compatibility.
 * @returns {ScuttleOpts} - Final scuttling options.
 */
function generateScuttleOpts(globalRef, originalOpts = create(null)) {
  const defaultOpts = {
    enabled: true,
    exceptions: [],
    scuttlerName: '',
  }
  const opts = assign(
    create(null),
    originalOpts === true ? defaultOpts : originalOpts,
    {
      scuttlerFunc: (globalRef, scuttle) => scuttle(globalRef),
    },
    {
      exceptions: (originalOpts?.exceptions || defaultOpts.exceptions).map(
        (e) => toRE(e)
      ),
    }
  )
  if (opts.scuttlerName) {
    if (!globalRef[opts.scuttlerName]) {
      throw new Error(
        `LavaMoat - 'scuttlerName' function "${opts.scuttlerName}" expected on globalRef.` +
          'To learn more visit https://github.com/LavaMoat/LavaMoat/pull/462.'
      )
    }
    opts.scuttlerFunc = globalRef[opts.scuttlerName]
  }
  return opts

  /**
   * @param {string|RegExp} except - Exception to convert to RegExp.
   * @returns {string|RegExp} - Converted exception.
   */
  function toRE(except) {
    // turn scuttleGlobalThis.exceptions regexes strings to actual regexes
    if (!except.startsWith('/')) {
      return except
    }
    const parts = except.split('/')
    const pattern = parts.slice(1, -1).join('/')
    const flags = parts[parts.length - 1]
    return new RegExp(pattern, flags)
  }
}

/**
 * Runs scuttling on the globalRef. Use applyDefaultScuttling for full scope of options.
 *
 * @param {GlobalRef} globalRef - Reference to the global object.
 * @param {Array<string|RegExp>} extraPropsToAvoid - List of additional properties to exclude from scuttling beyond the default ones.
 */
function performScuttleGlobalThis(globalRef, extraPropsToAvoid = []) {
  const props = []
  getPrototypeChain(globalRef).forEach((proto) =>
    props.push(...getOwnPropertyNames(proto))
  )

  // support LM,SES exported APIs and polyfills
  const avoidForLavaMoatCompatibility = ['Compartment', 'Error', 'globalThis']
  const propsToAvoid = new Set([
    ...avoidForLavaMoatCompatibility,
    ...extraPropsToAvoid,
  ])

  const obj = create(null)
  props.forEach((prop) => {
    const { get, set } = generateInvokers(prop)
    if (shouldAvoidProp(propsToAvoid, prop)) {
      return
    }
    let desc = getOwnPropertyDescriptor(globalRef, prop)
    if (desc?.configurable === true) {
      desc = { configurable: false, set, get }
    } else if (desc?.writable === true) {
      const p = new Proxy(obj, { getPrototypeOf: get, get, set })
      desc = { configurable: false, writable: false, value: p }
    } else {
      return
    }
    defineProperty(globalRef, prop, desc)
  })
}

/**
 * @param {Set<string|RegExp>} propsToAvoid - List of properties to exclude from scuttling.
 * @param {string} prop - Property to check.
 * @returns {boolean} - Whether the property should be avoided or not.
 */
const shouldAvoidProp = (propsToAvoid, prop) =>
  from(propsToAvoid).some(
    (avoid) =>
      (typeof avoid === 'string' && avoid === prop) ||
      (avoid instanceof RegExp && avoid.test(prop))
  )

/**
 * @param {object} value - object to get the prototype chain from.
 * @returns {Array<object>} - Prototype chain as an array.
 */
function getPrototypeChain(value) {
  const protoChain = []
  let current = value
  while (current) {
    if (typeof current !== 'object' && typeof current !== 'function') {
      break
    }
    protoChain.push(current)
    current = getPrototypeOf(current)
  }
  return protoChain
}

module.exports = {
  scuttle,
}
