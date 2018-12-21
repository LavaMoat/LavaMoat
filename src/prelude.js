// modified from original browser-pack prelude for readability + SES support

(function() {

  function outer(modules, cache, entry) {
    // Save the require from previous bundle to this closure if any
    var previousRequire = typeof require == "function" && require

    function newRequire(name, jumped){
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
        const moduleInitializer = moduleData[0]

        const endowments = {
          console: {
            assert: console.assert.bind(console),
            debug: console.debug.bind(console),
            error: console.error.bind(console),
            info: console.info.bind(console),
            log: console.log.bind(console),
            warn: console.warn.bind(console),
          },
        }
        const realm = SES.makeSESRootRealm()
        const wrappedInitializer = realm.evaluate(`(${moduleInitializer})`, endowments)

        wrappedInitializer.call(module.exports, scopedRequire, module, module.exports)

        function scopedRequire (requestedName) {
          var id = moduleData[1][requestedName] || requestedName
          return newRequire(id)
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

    // load entry points
    for(var i=0; i<entry.length; i++) newRequire(entry[i])

    // Override the current require with this new one
    return newRequire
  }

  return outer

})()
