/**
 * @type {Record<string, { globals: Record<string, boolean> }>}
 */
const incrementalPolicy = {}

const printPolicyDebug = () => {
  const policy = JSON.stringify(incrementalPolicy, null, 2)
  console.dir(policy)
}
globalThis.LM_printPolicyDebug = printPolicyDebug

/**
 * @type {NodeJS.Timeout}
 */
let debounceTimer

const PRINT_AFTER_NO_NEW_POLICY_DISCOVERED_MS = 3000

/**
 * Adds a key to the incremental policy.
 *
 * @param {string} hint - The hint for the incremental policy.
 * @param {string} key - The key to be added to the incremental policy.
 * @returns {void}
 */
function addToPolicy(hint, key) {
  if (!Object.hasOwn(incrementalPolicy, hint)) {
    incrementalPolicy[hint] = { globals: Object.create(null) }
  }
  if (!Object.hasOwn(incrementalPolicy[hint].globals, key)) {
    incrementalPolicy[hint].globals[key] = true
    const informativeStack =
      '\n' + (Error().stack || '').split('\n').slice(2).join('\n')
    console.log(`-- missing ${key} from ${hint}`, informativeStack)
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(
      printPolicyDebug,
      PRINT_AFTER_NO_NEW_POLICY_DISCOVERED_MS
    )
  }
}
/**
 * Creates a recursive proxy object that lets us tap into nested field lookups
 * at runtime.
 *
 * @param {string} hint - The hint for missing properties.
 * @param {string[]} path - The path to the missing property.
 * @returns {object} - The recursive proxy object.
 */
function recursiveProxy(hint, path) {
  if (path.length > 10) {
    console.warn(
      `LavaMoatPlugin: excessive property access depth for ${hint}: ${path.join('.')}`
    )
    return {}
  }
  return new Proxy(
    function () {}, //makes it callable to survive a few more lines before we cause an error and stop collecting further policy updates.
    {
      get(target, key) {
        if (typeof key === 'symbol') {
          key = key.toString()
        }
        path = [...path, key]
        addToPolicy(hint, path.join('.'))
        return recursiveProxy(hint, path)
      },
    }
  )
}

/**
 * Finds all non-symbol keys for an object and its prototype chain. Symbol keys
 * are not included to simplify the implementation of debugProxy.
 *
 * @param {object | null} obj
 */
function getAllKeys(obj) {
  const keys = []
  for (; obj != null; obj = Object.getPrototypeOf(obj)) {
    keys.push(...Object.getOwnPropertyNames(obj))
  }
  return keys
}

/**
 * Creates a debug proxy for a target object by replacing all own keys and
 * overshadowing the ones from the prototype chain.
 *
 * @param {any} target - The target object to create a debug proxy for.
 * @param {object} source - The keys to check for in the target object.
 * @param {string} hint - The hint to identify the source of the missing key.
 */
const debugProxy = (target, source, hint) => {
  const inheritedFromObj = Object.getOwnPropertyNames(Object.prototype)

  const keys = getAllKeys(source)
  for (const key of keys) {
    if (!Object.hasOwn(target, key) && !inheritedFromObj.includes(key)) {
      Object.defineProperty(target, key, {
        get() {
          addToPolicy(hint, key)
          return recursiveProxy(hint, [key])
        },
      })
    }
  }
}

const branded = new WeakSet()
/**
 * Brands a namespace as exported.
 *
 * @param {any} namespace - The namespace to brand.
 */
const brandExport = (namespace) => {
  if (typeof namespace === 'object' && namespace !== null) {
    branded.add(namespace)
  }
}
/**
 * Checks if namespace has been branded if applicable
 *
 * @param {any} namespace
 * @param {object} options
 * @param {string} options.specifier
 * @param {string} options.referrer
 * @param {string} options.requestedResourceId
 * @returns
 */
const brandCheck = (
  namespace,
  { specifier, referrer, requestedResourceId }
) => {
  if (
    // ignore primitives
    typeof namespace !== 'object' ||
    // tolerate empty objects from webpack's raw module
    (Object.getOwnPropertyNames(namespace).length === 0 &&
      Object.getPrototypeOf(namespace) === Object.prototype) ||
    // skip known ctx modules
    LAVAMOAT.ctxm.includes(specifier) ||
    // check the branding otherwise
    branded.has(namespace)
  ) {
    return namespace
  }
  console.warn(
    referrer +
      ' attempted to import an unwrapped module: "' +
      specifier +
      '" from ' +
      requestedResourceId,
    namespace
  )
  return namespace
}

module.exports = {
  debugProxy,
  brandExport,
  brandCheck,
}
