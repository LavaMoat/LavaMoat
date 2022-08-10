// the contents of this file will be copied into the prelude template
// this module has been written so that it required directly or copied and added to the template with a small wrapper
module.exports = makePrepareRealmGlobalFromConfig

// utilities for exposing configuring the exposed endowments on the container global

// The config uses a period-deliminated path notation to pull out deep values from objects
// These utilities help modify the container global to expose the allowed globals from the globalStore OR the platform global

function makePrepareRealmGlobalFromConfig ({ createFunctionWrapper }) {
  return {
    prepareCompartmentGlobalFromConfig,
    getTopLevelReadAccessFromPackageConfig,
    getTopLevelWriteAccessFromPackageConfig
  }

  function getTopLevelReadAccessFromPackageConfig (globalsConfig) {
    const result = Object.entries(globalsConfig)
      .filter(([key, value]) => value === 'read' || value === true || (value === 'write' && key.split('.').length > 1))
      .map(([key]) => key.split('.')[0])
    // return unique array
    return Array.from(new Set(result))
  }

  function getTopLevelWriteAccessFromPackageConfig (globalsConfig) {
    const result = Object.entries(globalsConfig)
      .filter(([key, value]) => value === 'write' && key.split('.').length === 1)
      .map(([key]) => key)
    return result
  }

  function prepareCompartmentGlobalFromConfig (packageCompartment, globalsConfig, endowments, globalStore, globalThisRefs) {
    const packageCompartmentGlobal = packageCompartment.globalThis
    // lookup top level read + write access keys
    const topLevelWriteAccessKeys = getTopLevelWriteAccessFromPackageConfig(globalsConfig)
    const topLevelReadAccessKeys = getTopLevelReadAccessFromPackageConfig(globalsConfig)

    // define accessors

    // allow read access via globalStore or packageCompartmentGlobal
    topLevelReadAccessKeys.forEach(key => {
      Object.defineProperty(packageCompartmentGlobal, key, {
        get () {
          if (globalStore.has(key)) {
            return globalStore.get(key)
          } else {
            return Reflect.get(endowments, key, this)
          }
        },
        set () {
          // TODO: there should be a config to throw vs silently ignore
          console.warn(`LavaMoat: ignoring write attempt to read-access global "${key}"`)
        }
      })
    })

    // allow write access to globalStore
    // read access via globalStore or packageCompartmentGlobal
    topLevelWriteAccessKeys.forEach(key => {
      Object.defineProperty(packageCompartmentGlobal, key, {
        get () {
          if (globalStore.has(key)) {
            return globalStore.get(key)
          } else {
            return endowments[key]
          }
        },
        set (value) {
          globalStore.set(key, value)
        },
        enumerable: true,
        configurable: true
      })
    })

    // set circular globalRefs
    globalThisRefs.forEach(key => {
      // if globalRef is actually an endowment, ignore
      if (topLevelReadAccessKeys.includes(key)) return
      if (topLevelWriteAccessKeys.includes(key)) return
      // set circular ref to global
      packageCompartmentGlobal[key] = packageCompartmentGlobal
    })

    // bind Function constructor this value to globalThis
    // legacy globalThis shim
    const origFunction = packageCompartmentGlobal.Function
    const newFunction = function (...args) {
      const fn = origFunction(...args)
      const unwrapTest = thisValue => thisValue === undefined
      return createFunctionWrapper(fn, unwrapTest, packageCompartmentGlobal)
    }
    Object.defineProperties(newFunction, Object.getOwnPropertyDescriptors(origFunction))
    packageCompartmentGlobal.Function = newFunction
  }
}
