// Sesify Prelude
(function() {

// START of injected code from sessDist
  __sessDist__
// END of injected code from sessDist

  const realm = SES.makeSESRootRealm()
  // helper for setting up endowmentsConfig
  const sesEval = (code) => realm.evaluate(code)

  const endowmentsConfig = (function(){
// START of injected code from endowmentsConfig
__endowmentsConfig__
// END of injected code from endowmentsConfig
  })()

  function createDefaultEndowments () {
    return (function(){
// START of injected code from defaultEndowments
__defaultEndowments__
// END of injected code from defaultEndowments
    })()
  }

  return loadBundle


  function loadBundle (modules, _, entryPoints) {
    // setup our global module cache
    const globalCache = {}
    // get nested endowments config
    const scopedEndowmentsConfig = endowmentsConfig.dependencies || {}
    // create SES-wrapped internalRequire
    const createInternalRequire = realm.evaluate(`(${internalRequireWrapper})`)
    const safeInternalRequire = createInternalRequire(modules, globalCache, endowmentsConfig, createDefaultEndowments, realm, eval)
    // load entryPoints
    for (let entryId of entryPoints) {
      safeInternalRequire(entryId, null, scopedEndowmentsConfig, [])
    }
  }

  // this is serialized and run in SES
  // mostly just exists to expose variables to internalRequire
  function internalRequireWrapper (modules, globalCache, endowmentsConfig, createDefaultEndowments, realm, rootEval) {
    return internalRequire

    function internalRequire (moduleId, providedEndowments, scopedEndowmentsConfig, depPath) {
      const moduleData = modules[moduleId]

      // if we dont have it, throw an error
      if (!moduleData) {
        const err = new Error('Cannot find module \'' + moduleId + '\'')
        err.code = 'MODULE_NOT_FOUND'
        throw err
      }

      // parse requirePath for module boundries
      const moduleDepPath = toModuleDepPath(depPath)
      const moduleDepPathSlug = moduleDepPath.join(' > ')

      // check our local cache, return exports if hit
      let localCache = globalCache[moduleDepPathSlug]
      if (!localCache) {
        localCache = {}
        globalCache[moduleDepPathSlug] = localCache
      }
      if (localCache[moduleId]) {
        const module = localCache[moduleId]
        return module.exports
      }

      // prepare the module to be initialized
      const module = { exports: {} }
      localCache[moduleId] = module
      const moduleSource = moduleData[0]
      const configForModule = getConfigForModule(endowmentsConfig, moduleDepPath)
      const isEntryModule = moduleDepPath.length < 1
      let moduleInitializer

      // determine if its a SES-wrapped or naked module initialization
      if (!isEntryModule && !configForModule.skipSes) {
        // prepare endowments
        const defaultEndowments = createDefaultEndowments()
        const endowmentsFromConfig = configForModule.$
        const endowments = Object.assign(defaultEndowments, providedEndowments, endowmentsFromConfig)
        // set the module initializer as the SES-wrapped version
        moduleInitializer = realm.evaluate(`${moduleSource}`, endowments)
      } else {
        // set the module initializer as the unwrapped version
        moduleInitializer = rootEval(`${moduleSource}`)
      }

      // this "modules" interface is exposed to the moduleInitializer https://github.com/browserify/browser-pack/blob/master/prelude.js#L38
      // browserify's browser-resolve uses arguments[4] to do direct module initializations
      // this proxy shims this behavior
      // TODO: would be better to just fix this by removing the indirection
      const modulesProxy = new Proxy({}, {
        get (_, targetModuleId) {
          const fakeModuleDefinition = [fakeModuleInitializer]
          return fakeModuleDefinition

          function fakeModuleInitializer () {
            const targetModuleExports = internalRequire(targetModuleId, providedEndowments, scopedEndowmentsConfig, depPath)
            // const targetModuleExports = scopedRequire(targetModuleId)
            module.exports = targetModuleExports
          }
        }
      })

      // initialize the module with the correct context
      moduleInitializer.call(module.exports, scopedRequire, module, module.exports, null, modulesProxy)

      // return the exports
      return module.exports


      // this is the require method passed to the module initializer
      // it has a context of the current dependency path and nested config
      function scopedRequire (requestedName, providedEndowments) {
        const childEndowmentsConfig = scopedEndowmentsConfig[requestedName] || {}
        const moduleDeps = moduleData[1]
        const id = moduleDeps[requestedName] || requestedName
        // recursive requires dont hit cache so it inf loops, so we shortcircuit
        // this only seems to happen with the "timers" which uses and is used by "process"
        if (id === moduleId) {
          if (requestedName !== 'timers') console.log('recursive:', requestedName)
          return module.exports
        }
        // update the dependency path for the child require
        const childDepPath = depPath.slice()
        childDepPath.push(requestedName)
        return internalRequire(id, providedEndowments, childEndowmentsConfig, childDepPath)
      }
    }

    function toModuleDepPath(depPath) {
      const moduleDepPath = []
      depPath.forEach((requestedName) => {
        const nameParts = requestedName.split('/')
        let nameInitial = nameParts[0]
        // skip relative resolution
        if (['.','..'].includes(nameInitial)) return
        // fix for scoped module names
        const moduleName = nameInitial.includes('@') ? `${nameParts[0]}/${nameParts[1]}` : nameInitial
        // record module name
        moduleDepPath.push(moduleName)
      })
      return moduleDepPath
    }

    function getConfigForModule(config, path) {
      const moduleName = path.slice(-1)[0]
      const globalConfig = (config.global || {})[moduleName]
      const depConfig = path.reduce((current, key) => current[key] || {}, config.dependencies)
      return Object.assign({}, globalConfig, depConfig)
    }

  }

})()
