// modified from original browser-pack prelude for readability + SES support

(function() {

  function outer(modules, cache, entryPoints) {
    // Save the require from previous bundle to this closure if any
    var previousRequire = typeof require == "function" && require

    function newRequire(name, jumped, providedEndowments){
      // SES - ignore cache
      // // check cache
      // if (cache[name]) {
      //   return cache[name].exports
      // }

      // check our modules
      const moduleData = modules[name]
      if (moduleData) {
        // SES - ignore cache
        // var module = cache[name] = { exports: {} }
        const module = { exports: {} }
        let moduleInitializer = moduleData[0]

        // if not an entrypoint, wrap in SES
        if (!entryPoints.includes(name)) {
          const defaultEndowments = {
            console: {
              assert: console.assert.bind(console),
              debug: console.debug.bind(console),
              error: console.error.bind(console),
              info: console.info.bind(console),
              log: console.log.bind(console),
              warn: console.warn.bind(console),
            },
          }
          const endowments = Object.assign(defaultEndowments, providedEndowments)

          const realm = SES.makeSESRootRealm()
          const wrappedInitializer = realm.evaluate(`(${moduleInitializer})`, endowments)
          // overwrite the module initializer with the SES-wrapped version
          moduleInitializer = wrappedInitializer
        }

        moduleInitializer.call(module.exports, scopedRequire, module, module.exports)

        function scopedRequire (requestedName, providedEndowments) {
          var id = moduleData[1][requestedName] || requestedName
          return newRequire(id, false, providedEndowments)
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
    for(var i=0; i<entryPoints.length; i++) newRequire(entryPoints[i])

    // Override the current require with this new one
    return newRequire
  }

  return outer

})()
