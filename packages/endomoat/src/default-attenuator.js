const {
  ENDO_ROOT_POLICY: ROOT_POLICY,
  ENDO_WRITE_POLICY: WRITE_POLICY,
} = require('./constants')
const { assign, create, keys, fromEntries, entries, defineProperties } = Object

let globalOverrides = create(null)

/**
 * @typedef {import('@endo/compartment-mapper').PolicyItem<import('.').RootPolicy|import('.').WritePolicy>} GlobalsPolicy
 */

const attenuators = {
  /**
   * @type {import('@endo/compartment-mapper').GlobalAttenuatorFn<[import('@endo/compartment-mapper').PackagePolicy<void, GlobalsPolicy>['globals']]>}
   */
  attenuateGlobals(params, originalObject, globalThis) {
    const policy = params[0]
    if (!policy) {
      return
    }
    console.debug('attenuateGlobals called', params)
    if (policy === ROOT_POLICY) {
      assign(globalThis, originalObject)
      // This assumes that the root compartment is the first to be attenuated
      globalOverrides = globalThis
      return
    }
    defineProperties(
      globalThis,
      fromEntries(
        entries(policy)
          .map(([key, policyValue]) => {
            if (policyValue) {
              /** @type {PropertyDescriptor} */
              const spec = {
                configurable: false,
                enumerable: true,
                get() {
                  console.log('- get', key)
                  return (
                    globalOverrides[key] ??
                    originalObject[
                      /** @type {keyof typeof originalObject} */ (key)
                    ]
                  )
                },
              }
              if (policyValue === WRITE_POLICY) {
                spec.set = (value) => {
                  console.log('- set', key)
                  globalOverrides[key] = value
                }
              }
              return [key, spec]
            }
            return [null, null]
          })
          .filter(([a]) => a)
      )
    )
  },
  /**
   * Picks stuff in the policy out of the original object
   * @type {import('@endo/compartment-mapper').ModuleAttenuatorFn<[import('@endo/compartment-mapper').PackagePolicy['packages']]>}
   */
  attenuateModule(params, originalObject) {
    console.debug('attenuateModule called', params)
    const ns = fromEntries(
      keys(params).map((key) => [key, /** @type {any} */ (originalObject)[key]])
    )
    return ns
  },
}

module.exports = attenuators
