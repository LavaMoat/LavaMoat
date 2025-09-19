/**
 * @typedef {{
 *   globals?: Record<string, boolean>
 *   packages?: Record<string, boolean>
 * }} PolicyResource
 *
 *
 * @typedef {Record<string, PolicyResource>} PolicyResources
 */

// @ts-ignore
const { sessionStorage } = globalThis

/** @type {PolicyResources} */
const incrementalPolicy = JSON.parse(
  sessionStorage.getItem('LM_POLICY') || '{}'
)

const savePolicy = () => {
  const policy = JSON.stringify(incrementalPolicy, null, 2)
  sessionStorage.setItem('LM_POLICY', policy)
  console.dir(policy)
}

/**
 * @param {PolicyResources} resources
 */
const addOverrides = (resources) => {
  override(resources, incrementalPolicy)
}
/**
 * @param {PolicyResources} receiver
 * @param {PolicyResources} donor
 */
const override = (receiver, donor) => {
  for (const name in donor) {
    if (!receiver[name]) {
      receiver[name] = donor[name]
    } else {
      receiver[name].globals = Object.assign(
        receiver[name].globals || {},
        donor[name].globals
      )
      receiver[name].packages = Object.assign(
        receiver[name].packages || {},
        donor[name].packages
      )
    }
  }
}

Object.defineProperty(globalThis, 'LM_getPolicy', {
  configurable: false,
  enumerable: false,
  value: savePolicy,
})
Object.defineProperty(globalThis, 'LM_clearPolicy', {
  configurable: false,
  enumerable: false,
  value: () => {
    sessionStorage.removeItem('LM_POLICY')
  },
})
Object.defineProperty(globalThis, 'LM_addPolicy', {
  configurable: false,
  enumerable: false,
  /**
   * Add edits to a session policy
   *
   * @param {PolicyResources} edits
   */
  value: (edits) => {
    override(incrementalPolicy, edits)
    savePolicy()
  },
})

/**
 * @type {NodeJS.Timeout}
 */
let debounceTimer

const PRINT_AFTER_NO_NEW_POLICY_DISCOVERED_MS = 3000

let LIMITED_TIME_OFFER = 100

/**
 * @param {string} resourceId
 * @param {'packages' | 'globals'} field
 * @param {string} key
 * @returns
 */
const isNewToPolicy = (resourceId, field, key) => {
  if (!Object.hasOwn(incrementalPolicy, resourceId)) {
    incrementalPolicy[resourceId] =
      /** @type {PolicyResource} */ Object.create(null)
  } else if (!Object.hasOwn(incrementalPolicy[resourceId], field)) {
    incrementalPolicy[resourceId][field] = Object.create(null)
  }
  if (!Object.hasOwn(incrementalPolicy[resourceId][field], key)) {
    incrementalPolicy[resourceId][field][key] = true
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(
      savePolicy,
      PRINT_AFTER_NO_NEW_POLICY_DISCOVERED_MS
    )
    return true
  } else {
    return false
  }
}

/**
 * Adds a key to the incremental policy.
 *
 * @param {string} hint - The hint for the incremental policy.
 * @param {string} key - The key to be added to the incremental policy.
 * @returns {void}
 */
function addGlobalToPolicy(hint, key) {
  if (isNewToPolicy(hint, 'globals', key)) {
    const informativeStack =
      '\n' + (Error().stack || '').split('\n').slice(2).join('\n')
    console.log(`-- missing ${key} from ${hint}`, informativeStack)
  } else {
    // the same field was reported again
    LIMITED_TIME_OFFER -= 1
    if (LIMITED_TIME_OFFER < 0) {
      savePolicy()
      throw Error(
        'LavaMoat runtime debugger is under heavy load and will now stop. Apply the policy overrides found, rebuild and run again.'
      )
    }
  }
}
/**
 * Adds a key to the incremental policy.
 *
 * @param {string} parent - The parent package.
 * @param {string} key - The imported package.
 * @returns {void}
 */
function addPkgToPolicy(parent, key) {
  if (isNewToPolicy(parent, 'packages', key)) {
    const informativeStack =
      '\n' + (Error().stack || '').split('\n').slice(2).join('\n')
    console.log(`-- missing package ${key} from ${parent}`, informativeStack)
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
  if (path.length > 5 || LIMITED_TIME_OFFER < 0) {
    // prevent infinite recursion
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
        addGlobalToPolicy(hint, path.join('.'))
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

let prevSource = {}
/** @type {string[]} */
let prevKeys = []

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

  let keys = []
  if (source === prevSource) {
    keys = prevKeys
  } else {
    keys = getAllKeys(source)
    prevSource = source
    prevKeys = keys
  }
  for (const key of keys) {
    if (!Object.hasOwn(target, key) && !inheritedFromObj.includes(key)) {
      Object.defineProperty(target, key, {
        get() {
          addGlobalToPolicy(hint, key)
          return recursiveProxy(hint, [key])
        },
      })
    }
  }
}
/**
 * @param {string} requestedResourceId
 * @param {string} referrerResourceId
 */
const debugPackage = (requestedResourceId, referrerResourceId) => {
  addPkgToPolicy(referrerResourceId, requestedResourceId)
}

module.exports = {
  debugProxy,
  debugPackage,
  addOverrides,
}
