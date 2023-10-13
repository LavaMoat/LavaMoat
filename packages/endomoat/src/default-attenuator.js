import {
  ENDO_ROOT_POLICY as ROOT_POLICY,
  ENDO_WRITE_POLICY as WRITE_POLICY,
} from './constants.js'

const { assign, create, keys, fromEntries, entries, defineProperties } = Object

let globalOverrides = create(null)

export default {
  /**
   * @type {import('@endo/compartment-mapper').GlobalAttenuatorFn<[import('./policy-converter.js').LavaMoatPackagePolicy['globals']]>}
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
    if (policy === WRITE_POLICY) {
      throw new Error('Not yet implemented')
    }
    defineProperties(
      globalThis,
      fromEntries(
        entries(policy)
          .filter(([, policyValue]) => Boolean(policyValue))
          .map(([key, policyValue]) => {
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
          })
      )
    )
  },
  /**
   * Picks stuff in the policy out of the original object
   * @type {import('@endo/compartment-mapper').ModuleAttenuatorFn<[import('./policy-converter.js').LavaMoatPackagePolicy['packages']]>}
   */
  attenuateModule(params, originalObject) {
    console.debug('attenuateModule called', params)
    const ns = fromEntries(
      keys(params).map((key) => [key, /** @type {any} */ (originalObject)[key]])
    )
    return ns
  },
}
