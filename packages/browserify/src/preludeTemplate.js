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

  return loadBundle


  // this performs an unsafeEval in the context of the provided endowments
  function evalWithEndowments(code, endowments) {
    with (endowments) {
      return eval(code)
    }
  }

  function loadBundle (modules, _, entryPoints) {
    const globalRef = (typeof self !== 'undefined') ? self : global
    // setup our global module cache
    const globalCache = {}
    // create SES-wrapped internalRequire
    const createInternalRequire = realm.evaluate(`(${internalRequireWrapper})`, { console })
    const safeInternalRequire = createInternalRequire(modules, globalCache, endowmentsConfig, realm, eval, evalWithEndowments, globalRef)
    // load entryPoints
    for (let entryId of entryPoints) {
      safeInternalRequire(entryId, null, [])
    }
  }

  // this is serialized and run in SES
  // mostly just exists to expose variables to internalRequire
  function internalRequireWrapper (modules, globalCache, endowmentsConfig, realm, unsafeEval, unsafeEvalWithEndowments, globalRef) {
    return internalRequire

    function internalRequire (moduleId, providedEndowments, depPath) {
      const moduleData = modules[moduleId]

      // if we dont have it, throw an error
      if (!moduleData) {
        const err = new Error('Cannot find module \'' + moduleId + '\'')
        err.code = 'MODULE_NOT_FOUND'
        throw err
      }

      // parse requirePath for module boundries
      const moduleDepPath = toModuleDepPath(depPath)
      const moduleCacheSlug = moduleId

      // check our local cache, return exports if hit
      let localCache = globalCache[moduleCacheSlug]
      if (!localCache) {
        localCache = {}
        globalCache[moduleCacheSlug] = localCache
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

      // prepare endowments
      const endowmentsFromConfig = configForModule.$
      let endowments = Object.assign({}, endowmentsConfig.defaultGlobals, providedEndowments, endowmentsFromConfig)
      // special case for exposing window
      if (endowments.window) {
        endowments = Object.assign({}, endowments.window, endowments)
      }
      // set global references, skip if from entry module
      if (isEntryModule) {
        endowments.global = globalRef
        endowments.window = globalRef
        endowments.self = globalRef
      } else {
        endowments.global = endowments
        endowments.window = endowments
        endowments.self = endowments
      }

      // determine if its a SES-wrapped or naked module initialization
      let moduleInitializer
      const runInSes = !isEntryModule && !configForModule.skipSes
      if (runInSes) {
        // set the module initializer as the SES-wrapped version
        moduleInitializer = realm.evaluate(`${moduleSource}`, endowments)
      } else {
        // set the module initializer as the unwrapped version
        moduleInitializer = unsafeEvalWithEndowments(`${moduleSource}`, endowments)
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
            const targetModuleExports = internalRequire(targetModuleId, providedEndowments, depPath)
            // const targetModuleExports = scopedRequire(targetModuleId)
            module.exports = targetModuleExports
          }
        }
      })

      // initialize the module with the correct context
      moduleInitializer.call(module.exports, scopedRequire, module, module.exports, null, modulesProxy)

      // prevent module.exports from being modified
      Object.freeze(module.exports)

      // return the exports
      return module.exports


      // this is the require method passed to the module initializer
      // it has a context of the current dependency path and nested config
      function scopedRequire (requestedName, providedEndowments) {
        const moduleDeps = moduleData[1]
        const id = moduleDeps[requestedName] || requestedName
        // recursive requires dont hit cache so it inf loops, so we shortcircuit
        // this only seems to happen with the "timers" which uses and is used by "process"
        if (id === moduleId) {
          if (requestedName !== 'timers') throw new Error('Sesify - recursive require detected')
          return module.exports
        }
        // update the dependency path for the child require
        const childDepPath = depPath.slice()
        childDepPath.push(requestedName)
        return internalRequire(id, providedEndowments, childDepPath)
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
      const depPathSlug = path.join(' ')
      const depConfig = (config.dependencies || {})[depPathSlug]
      return Object.assign({}, globalConfig, depConfig)
    }

    //# sourceURL=internalRequire
  }

})()
