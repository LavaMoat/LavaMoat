// @ts-check
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
    'LavaMoat: runtime execution started without SES present, switching to no-op.',
  )
}

const { getEndowmentsForConfig, copyWrappedGlobals } =
  LAVAMOAT.endowmentsToolkit()

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
    }),
  ),
)

// Policy implementation
// This part would require bundling a subset of the core runtime
const enforcePolicy = (requestedResourceId, referrerResourceId) => {
  requestedResourceId = '' + requestedResourceId
  referrerResourceId = '' + referrerResourceId
  // implicitly allow all for root and modules from the same package
  if (
    referrerResourceId === LAVAMOAT.root ||
    requestedResourceId === referrerResourceId
  ) {
    return
  }
  const myPolicy = LAVAMOAT.policy.resources[referrerResourceId] || {}
  if (myPolicy.packages && myPolicy.packages[requestedResourceId]) {
    return
  }
  throw Error(
    `Policy does not allow importing ${requestedResourceId} from ${referrerResourceId}`,
  )
}

const theRealGlobalThis = globalThis
let rootCompartmentGlobalThis
const installGlobalsForPolicy = (resourceId, packageCompartmentGlobal) => {
  if (resourceId === LAVAMOAT.root) {
    rootCompartmentGlobalThis = packageCompartmentGlobal
    copyWrappedGlobals(theRealGlobalThis, rootCompartmentGlobalThis, [
      'globalThis',
      'window',
      'self',
    ])
  } else {
    // TODO: getEndowmentsForConfig doesn't implement support for "write"
    const endowments = getEndowmentsForConfig(
      rootCompartmentGlobalThis,
      LAVAMOAT.policy.resources[resourceId] || {},
      globalThis,
      packageCompartmentGlobal,
    )

    defineProperties(
      packageCompartmentGlobal,
      getOwnPropertyDescriptors(endowments),
    )
  }
}

const compartmentMap = new Map()
const findResourceId = (moduleId) => {
  const found = LAVAMOAT.idmap.find(([, moduleIds]) =>
    moduleIds.includes(moduleId),
  )
  if (found) {
    return found[0]
  }
}

const wrapRequireWithPolicy = (__webpack_require__, referrerResourceId) =>
  function (specifier) {
    if (!LAVAMOAT.unenforceable.includes(specifier)) {
      const requestedResourceId = findResourceId(specifier)
      enforcePolicy(requestedResourceId, referrerResourceId)
    }
    return __webpack_require__.apply(this, arguments)
  }

const lavamoatRuntimeWrapper = (resourceId, runtimeKit) => {
  if (!LOCKDOWN_ON) {
    // Scope Terminator not being present in the output causes the wrapper closure to run a no-op instaed of the module body
    return create(null)
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
      policyRequire[item] = harden(__webpack_require__[item])
    }

    // TODO: check if this is not breaking anything
    policyRequire.m = new Proxy(
      {},
      {
        has: (target, prop) => {
          warn(
            `A module attempted to read ${prop} directly from webpack's module cache`,
          )
          return false
        },
      },
    )

    // override nmd to limit what it can mutate
    policyRequire.nmd = (moduleReference) => {
      if (moduleReference === module) {
        module = __webpack_require__.nmd(module)
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
  freeze(runtimeHandler)

  if (!compartmentMap.has(resourceId)) {
    // Endow original Math and Date, because SES tames them and we don't need that
    const c = new Compartment({ Math, Date })
    installGlobalsForPolicy(resourceId, c.globalThis)
    compartmentMap.set(resourceId, c)
  }

  return {
    [NAME_scopeTerminator]: stricterScopeTerminator,
    [NAME_runtimeHandler]: runtimeHandler,
    [NAME_globalThis]: compartmentMap.get(resourceId).globalThis,
  }
}

// defaultExport is getting assigned to __webpack_require__._LM_
LAVAMOAT.defaultExport = freeze(lavamoatRuntimeWrapper)
