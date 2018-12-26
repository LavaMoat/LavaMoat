// Sesify Prelude
(function() {

// START of injected code from sessDist
  __sessDist__
// START of injected code from sessDist

  const globalRealm = SES.makeSESRootRealm()
  const sesEval = (code) => globalRealm.evaluate(code)

  const endowmentsConfig = (function(){
// START of injected code from endowmentsConfig
__endowmentsConfig__
// END of injected code from endowmentsConfig
  })()

  function createDefaultEndowments () {
    return (
// START of injected code from defaultEndowments
__defaultEndowments__
// END of injected code from defaultEndowments
    )
  }

  const realms = {}

  function outer(modules, globalCache, entryPoints) {
    // Save the require from previous bundle to this closure if any
    var previousRequire = typeof require == "function" && require

    function newRequire(name, jumped, providedEndowments, scopedEndowmentsConfig, depPath, preferredRealm){
      // check our modules
      const moduleData = modules[name]
      if (moduleData) {

        const moduleDepPath = toModuleDepPath(depPath)

        // check our local cache
        const localCache = globalCache[moduleDepPath] || {}
        if (localCache[name]) {
          const module = localCache[name]
          return module.exports
        }

        // prepare the module to be initialized
        const module = { exports: {} }
        // save module to localCache
        localCache[name] = module
        globalCache[moduleDepPath] = localCache

        let moduleInitializer = moduleData[0]
        const configForModule = getConfigForModule(endowmentsConfig, moduleDepPath)
        const moduleDepPathSlug = moduleDepPath.join(' > ')

        const isEntryPoint = entryPoints.includes(name)
        const isRelativeToEntryPoint = moduleDepPath.length < 1

        // if not an entrypoint or not explicitly skipped, wrap in SES
        if (!isEntryPoint && !isRelativeToEntryPoint && !configForModule.skipSes) {

          const defaultEndowments = createDefaultEndowments()
          // const endowmentsFromConfig = scopedEndowmentsConfig['$']
          const endowmentsFromConfig = configForModule.$
          const endowments = Object.assign(defaultEndowments, providedEndowments, endowmentsFromConfig)

          // here we are caching the realm based on the slug
          let realm = preferredRealm || realms[moduleDepPathSlug]
          if (!realm) {
            console.log('realm for:', moduleDepPathSlug)
            realm = SES.makeSESRootRealm()
            realms[moduleDepPathSlug] = realm
          }

          const wrappedInitializer = realm.evaluate(`(${moduleInitializer})`, endowments)
          // overwrite the module initializer with the SES-wrapped version
          moduleInitializer = wrappedInitializer
        }

        // the following are exposed to the moduleInitializer https://github.com/browserify/browser-pack/blob/master/prelude.js#L38
        // some of these are dangerous to expose
        moduleInitializer.call(module.exports, scopedRequire, module, module.exports, outer, modules)

        function scopedRequire (requestedName, providedEndowments) {
          const childEndowmentsConfig = scopedEndowmentsConfig[requestedName] || {}
          var id = moduleData[1][requestedName] || requestedName
          // recursive requires dont hit cache so it inf loops, so we shortcircuit
          if (id === name) {
            if (requestedName !== 'timers') console.log('recursive:', requestedName)
            return module.exports
          }
          // this is just for debugging
          const childDepPath = depPath.slice()
          childDepPath.push(requestedName)
          const realmForChild = preferredRealm
            // global realm
            || (endowmentsConfig.useGlobalRealm && globalRealm)
            // realm inheritance
            || (configForModule.shareRealmWithChildren && realms[moduleDepPathSlug])
          return newRequire(id, false, providedEndowments, childEndowmentsConfig, childDepPath, realmForChild)
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
    for (var i=0; i<entryPoints.length; i++) {
      newRequire(entryPoints[i], false, null, endowmentsConfig, [])
    }

    // Override the current require with this new one
    return newRequire
  }

  return outer

  function toModuleDepPath(depthPath) {
    const moduleDepPath = []
    depthPath.forEach((pathPart) => {
      const pathInitial = pathPart.split('/')[0]
      // skip relative resolution
      if (['.','..'].includes(pathInitial)) return
      // otherwise keep module name
      moduleDepPath.push(pathInitial)
    })
    return moduleDepPath
  }

  function getConfigForModule(config, path) {
    const moduleName = path.slice(-1)[0]
    const globalConfig = (config.global || {})[moduleName]
    const depConfig = path.reduce((current, key) => current[key] || {}, config.dependencies)
    return Object.assign({}, globalConfig, depConfig)
  }

})()
