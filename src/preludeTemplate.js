// Sesify Prelude
(function() {

// START of injected code from sessDist
  __sessDist__
// START of injected code from sessDist

  const realm = SES.makeSESRootRealm()
  // helper for setting up endowmentsConfig
  const sesEval = (code) => realm.evaluate(code)

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

  function outer(modules, globalCache, entryPoints) {

    function newRequire(name, jumped, providedEndowments, scopedEndowmentsConfig, depPath){
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

        const moduleSource = moduleData[0]
        const configForModule = getConfigForModule(endowmentsConfig, moduleDepPath)
        const moduleDepPathSlug = moduleDepPath.join(' > ')

        const isEntryPoint = entryPoints.includes(name)
        const isRelativeToEntryPoint = moduleDepPath.length < 1

        let moduleInitializer

        // if not an entrypoint or not explicitly skipped, wrap in SES
        if (!isEntryPoint && !isRelativeToEntryPoint && !configForModule.skipSes) {

          const defaultEndowments = createDefaultEndowments()
          // const endowmentsFromConfig = scopedEndowmentsConfig['$']
          const endowmentsFromConfig = configForModule.$
          const endowments = Object.assign(defaultEndowments, providedEndowments, endowmentsFromConfig)

          const wrappedInitializer = realm.evaluate(`${moduleSource}`, endowments)
          // overwrite the module initializer with the SES-wrapped version
          moduleInitializer = wrappedInitializer
        } else {
          moduleInitializer = eval(`${moduleSource}`)
        }

        // this modules interface is exposed to the moduleInitializer https://github.com/browserify/browser-pack/blob/master/prelude.js#L38
        // eg browserify's browser-resolve uses arguments[4] to do direct module initializations
        // this proxy shims this behavior
        // TODO: would be better to just fix this by removing the indirection
        const modulesProxy = new Proxy({}, {
          get (_, targetModuleId) {
            const fakeModuleDefinition = [fakeModuleInitializer]
            return fakeModuleDefinition

            function fakeModuleInitializer () {
              const targetModuleExports = newRequire(targetModuleId, false, providedEndowments, scopedEndowmentsConfig, depPath)
              // const targetModuleExports = scopedRequire(targetModuleId)
              module.exports = targetModuleExports
            }
          }
        })

        moduleInitializer.call(module.exports, scopedRequire, module, module.exports, null, modulesProxy)

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
          return newRequire(id, false, providedEndowments, childEndowmentsConfig, childDepPath)
        }

        return module.exports
      }

      // we dont have it, throw an error
      const err = new Error('Cannot find module \'' + name + '\'')
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

  function deepFreeze (o) {
    Object.freeze(o)

    Object.getOwnPropertyNames(o).forEach(function (prop) {
      if (o.hasOwnProperty(prop)
      && o[prop] !== null
      && (typeof o[prop] === "object" || typeof o[prop] === "function")
      && !Object.isFrozen(o[prop])) {
        deepFreeze(o[prop])
      }
    })

    return o
  }


})()
