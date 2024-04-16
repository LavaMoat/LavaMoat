/// <reference path="./runtime.d.ts" />
/* global LAVAMOAT */
/* global lockdown, harden, Compartment */

const {
  create,
  freeze,
  assign,
  defineProperty,
  defineProperties,
  getOwnPropertyDescriptors,
  fromEntries,
  entries,
  values,
} = Object
const warn = typeof console === 'object' ? console.warn : () => {}
// Avoid running any wrapped code or using compartment if lockdown was not called.
// This is for when the bundle ends up running despite SES being missing.
// It was previously useful for sub-compilations running an incomplete bundle as part of the build, but currently that is being skipped. We might go back to it for the sake of build time security if it's deemed worthwihile in absence of lockdown.
const LOCKDOWN_ON = typeof lockdown !== 'undefined'
if (LOCKDOWN_ON) {
  lockdown(LAVAMOAT.options.lockdown)
} else {
  warn(
    'LavaMoat: runtime execution started without SES present, switching to no-op.'
  )
}

const knownWritableFields = new Set()

values(LAVAMOAT.policy.resources).forEach((resource) => {
  if (resource.globals && typeof resource.globals === 'object') {
    entries(resource.globals).forEach(([key, value]) => {
      if (value === 'write') {
        knownWritableFields.add(key)
      }
    })
  }
})

const { getEndowmentsForConfig, copyWrappedGlobals } =
  LAVAMOAT.endowmentsToolkit({
    handleGlobalWrite: true,
    knownWritableFields,
  })

// These must match assumptions in the wrapper.js
// sharedKeys are included in the runtime

const { NAME_globalThis, NAME_scopeTerminator, NAME_runtimeHandler } =
  LAVAMOAT.ENUM

// strictScopeTerminator from SES is not strict enough - `has` would only return true for globals
// and here we want to prevent reaching into the scope where local variables from bundle runtime are available.
const stricterScopeTerminator = freeze(
  new Proxy(
    freeze(create(null)),
    freeze({
      // TODO: emulate a reference error in a getter.
      has: freeze(() => true),
    })
  )
)

/**
 * Enforces the policy for resource imports.
 *
 * @param {string} specifier - The ID of the requested resource.
 * @param {string} referrerResourceId - The ID of the referrer resource.
 * @throws {Error} Throws an error if the policy does not allow importing the
 *   requested resource from the referrer resource.
 */
const enforcePolicy = (specifier, referrerResourceId) => {
  if (typeof specifier === 'undefined') {
    throw Error(`Requested specifier is undefined`)
  }
  // implicitly allow all for root
  if (referrerResourceId === LAVAMOAT.root) {
    return
  }
  const myPolicy = LAVAMOAT.policy.resources[referrerResourceId] || {}
  // @ts-expect-error - missing details in policy type, see TODO in types.js
  if (myPolicy.builtin && myPolicy.builtin[specifier]) {
    return
  }
  const requestedResourceId = findResourceId(specifier)
  if (!requestedResourceId) {
    throw Error(
      `Requested specifier ${specifier} is not allowed as a builtin and not a known dependency of ${referrerResourceId}`
    )
  }
  // allow imports internal to the package
  if (requestedResourceId === referrerResourceId) {
    return
  }
  // @ts-expect-error - missing details in policy type, see TODO in types.js
  if (myPolicy.packages && myPolicy.packages[requestedResourceId]) {
    return
  }

  throw Error(
    `Policy does not allow importing ${requestedResourceId} from ${referrerResourceId}`
  )
}

const theRealGlobalThis = globalThis
/** @type {any} */
let rootCompartmentGlobalThis
const globalAliases = ['globalThis', 'window', 'self']
/**
 * Installs globals for a specific policy resource.
 *
 * @param {string} resourceId - The ID of the resource.
 * @param {Object} packageCompartmentGlobal - The global object of the package
 *   compartment.
 */
const installGlobalsForPolicy = (resourceId, packageCompartmentGlobal) => {
  if (resourceId === LAVAMOAT.root) {
    rootCompartmentGlobalThis = packageCompartmentGlobal
    copyWrappedGlobals(
      theRealGlobalThis,
      rootCompartmentGlobalThis,
      globalAliases
    )
  } else {
    // TODO: getEndowmentsForConfig doesn't implement support for "write"
    const endowments = getEndowmentsForConfig(
      rootCompartmentGlobalThis,
      LAVAMOAT.policy.resources[resourceId] || {},
      globalThis,
      packageCompartmentGlobal
    )

    defineProperties(
      packageCompartmentGlobal,
      fromEntries(
        globalAliases.map((alias) => [
          alias,
          { value: packageCompartmentGlobal },
        ])
      )
    )
    defineProperties(
      packageCompartmentGlobal,
      getOwnPropertyDescriptors(endowments)
    )
  }
}

const compartmentMap = new Map()
/**
 * @param {string} moduleId
 * @returns {string | undefined}
 */
const findResourceId = (moduleId) => {
  const found = LAVAMOAT.idmap.find(([, moduleIds]) =>
    moduleIds.includes(moduleId)
  )
  if (found) {
    return found[0]
  }
}

/**
 * @callback WrappedRequire
 * @param {string} specifier
 */

/**
 * Wraps the **webpack_require** function with a policy enforcement logic.
 *
 * @param {function} __webpack_require__ - The original **webpack_require**
 *   function.
 * @param {string} referrerResourceId - The resource ID of the referrer module.
 * @returns {WrappedRequire} - The wrapped **webpack_require** function.
 */
const wrapRequireWithPolicy = (__webpack_require__, referrerResourceId) =>
  function (specifier) {
    if (!LAVAMOAT.unenforceable.includes(specifier)) {
      enforcePolicy(specifier, referrerResourceId)
    }
    // @ts-ignore - unknown this is the point here
    return __webpack_require__.apply(this, arguments)
  }

/**
 * Wraps the webpack runtime with Lavamoat security features.
 *
 * @param {string} resourceId - The identifier of the resource.
 * @param {any} runtimeKit - The runtime kit containing bits from the webpack
 *   runtime.
 * @returns {Object} - An object containing the wrapped runtime and other
 *   related properties.
 */
const lavamoatRuntimeWrapper = (resourceId, runtimeKit) => {
  if (!LOCKDOWN_ON) {
    // Scope Terminator not being present in the output causes the wrapper closure to run a no-op instaed of the module body
    return create(null)
  }

  if (!compartmentMap.has(resourceId)) {
    // Endow original Math and Date, because SES tames them and we don't need that
    const c = new Compartment({ Math, Date })
    installGlobalsForPolicy(resourceId, c.globalThis)
    compartmentMap.set(resourceId, c)
  }

  let overrides = create(null)

  // modules may reference `require` dynamically, but that's something we don't want to allow
  const { __webpack_require__ } = runtimeKit
  let { module } = runtimeKit

  if (__webpack_require__) {
    // wrap webpack runtime for policy check and hardening
    const policyRequire = wrapRequireWithPolicy(__webpack_require__, resourceId)

    // TODO: figure out what to wrap and what to copy
    // TODO: most of the work here could be done once instead of for each wrapping

    // Webpack has built-in plugins that add more runtime functions. We might need to support them eventually.
    // It's a case-by-case basis decision.
    // TODO: print a warning for other functions on the __webpack_require__ namespace that we're not supporting.
    //   It's probably best served at build time though - with runtimeRequirements or looking at the items in webpack runtime when adding lavamoat runtime.

    // The following seem harmless and are used by default: ['O', 'n', 'd', 'o', 'r', 's']
    const supportedRuntimeItems = ['O', 'n', 'd', 'o', 'r', 's']
    for (const item of supportedRuntimeItems) {
      // @ts-expect-error - I'm not gonna do webppack's minified runtime typing
      policyRequire[item] = harden(__webpack_require__[item])
    }

    // TODO: check if this is not breaking anything
    // @ts-expect-error - webpack runtime is not typed
    policyRequire.m = new Proxy(
      {},
      {
        has: (target, prop) => {
          warn(
            `A module attempted to read ${String(
              prop
            )} directly from webpack's module cache`
          )
          return false
        },
      }
    )

    // webpack rewrites regerences to `global` to `__webpack_require__.g` in the bundle
    policyRequire.g = compartmentMap.get(resourceId).globalThis

    // override nmd to limit what it can mutate
    // @ts-expect-error - webpack runtime is not typed
    policyRequire.nmd = (moduleReference) => {
      if (moduleReference === module) {
        module = __webpack_require__.nmd(module)
        return module
      }
    }

    overrides.__webpack_require__ = policyRequire
  }
  const runtimeHandler = assign(create(null), runtimeKit, overrides)

  // allow setting, but ignore value for /* module decorator */ module = __webpack_require__.nmd(module)
  defineProperty(runtimeHandler, 'module', {
    get: () => module,
    set: () => {},
  })
  // Make it possible to overwrite `exports` locally despite runtimeHandler being frozen
  let exportsReference = runtimeHandler.exports
  defineProperty(runtimeHandler, 'exports', {
    get: () => exportsReference,
    set: (value) => {
      exportsReference = value
    },
  })
  freeze(runtimeHandler)

  return {
    [NAME_scopeTerminator]: stricterScopeTerminator,
    [NAME_runtimeHandler]: runtimeHandler,
    [NAME_globalThis]: compartmentMap.get(resourceId).globalThis,
  }
}

// defaultExport is getting assigned to __webpack_require__._LM_
LAVAMOAT.defaultExport = freeze(lavamoatRuntimeWrapper)
