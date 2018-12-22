// Sesify Prelude
(function() {

// START of injected code from sessDist
  __sessDist__
// START of injected code from sessDist

  const endowmentsConfig = (
// START of injected code from endowmentsConfig
__endowmentsConfig__
// END of injected code from endowmentsConfig
  )

  function createDefaultEndowments () {
    return (
// START of injected code from defaultEndowments
__defaultEndowments__
// END of injected code from defaultEndowments
    )
  }

  function outer(modules, cache, entryPoints) {
    // Save the require from previous bundle to this closure if any
    var previousRequire = typeof require == "function" && require

    function newRequire(name, jumped, providedEndowments, scopedEndowmentsConfig){
      // check our modules
      const moduleData = modules[name]
      if (moduleData) {
        const module = { exports: {} }
        let moduleInitializer = moduleData[0]

        // if not an entrypoint, wrap in SES
        if (!entryPoints.includes(name)) {
          const defaultEndowments = createDefaultEndowments()
          const endowmentsFromConfig = scopedEndowmentsConfig['$']
          const endowments = Object.assign(defaultEndowments, providedEndowments, endowmentsFromConfig)

          const realm = SES.makeSESRootRealm()
          const wrappedInitializer = realm.evaluate(`(${moduleInitializer})`, endowments)
          // overwrite the module initializer with the SES-wrapped version
          moduleInitializer = wrappedInitializer
        }

        moduleInitializer.call(module.exports, scopedRequire, module, module.exports)

        function scopedRequire (requestedName, providedEndowments) {
          const childEndowmentsConfig = scopedEndowmentsConfig[requestedName] || {}
          var id = moduleData[1][requestedName] || requestedName
          return newRequire(id, false, providedEndowments, childEndowmentsConfig)
        }

        return module.exports
      }
      // we dont have it, look somewhere else

      // if we cannot find the module within our internal map or
      // cache, jump to the current global require ie. the last bundle
      // that was added to the page.
      var currentRequire = typeof require == "function" && require
      if (!jumped && currentRequire) return currentRequire(name, true)

      // If there are other bundles on this page the require from the
      // previous one is saved to 'previousRequire'. Repeat this as
      // many times as there are bundles until the module is found or
      // we exhaust the require chain.
      if (previousRequire) return previousRequire(name, true)
      var err = new Error('Cannot find module \'' + name + '\'')
      err.code = 'MODULE_NOT_FOUND'
      throw err
    }

    // load entryPoints
    for(var i=0; i<entryPoints.length; i++) newRequire(entryPoints[i], false, null, endowmentsConfig)

    // Override the current require with this new one
    return newRequire
  }

  return outer

})()
