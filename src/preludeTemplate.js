// Sesify Prelude
;(function() {

  // define SES
  const SES = (function(){
    const exports = {}
    const module = { exports }
    ;(function(){
// START of injected code from sessDist
__sessDist__
// END of injected code from sessDist
    })()
    return module.exports
  })()

  const realm = SES.makeSESRootRealm({
    mathRandomMode: 'allow',
    errorStackMode: 'allow',
  })
  const sesRequire = realm.makeRequire({
    '@agoric/harden': true,
  })
  const harden = sesRequire('@agoric/harden')

  // define makeMagicCopy
  const unsafeMakeMagicCopy = (function(){
    const exports = {}
    const module = { exports }
    ;(function(){
// START of injected code from magicCopy
__magicCopy__
// END of injected code from magicCopy
    })()
    return module.exports
  })()

  const makeMagicCopy = realm.evaluate(`(${unsafeMakeMagicCopy})`)

  const sesifyConfig = (function(){
// START of injected code from sesifyConfig
__sesifyConfig__
// END of injected code from sesifyConfig
  })()

  return loadBundle


  // this performs an unsafeEval in the context of the provided endowments
  function evalWithEndowments(code, endowments) {
    with (endowments) {
      return eval(code)
    }
  }

  function loadBundle (modules, _, entryPoints) {
    // debug - log module content instead of execution
    if (typeof process !== 'undefined' && process.env.MODULE_DUMP) {
      const moduleData = modules[process.env.MODULE_DUMP]
      console.log(JSON.stringify(moduleData))
      return
    }
    const globalRef = (typeof self !== 'undefined') ? self : global
    // setup our global module cache
    const globalCache = {}
    // create SES-wrapped internalRequire
    const createInternalRequire = realm.evaluate(`(${internalRequireWrapper})`, { console })
    const safeInternalRequire = createInternalRequire(modules, globalCache, sesifyConfig, realm, harden, makeMagicCopy, eval, evalWithEndowments, globalRef)
    // load entryPoints
    for (let entryId of entryPoints) {
      safeInternalRequire(entryId, null, [])
    }
  }

  // this is serialized and run in SES
  // mostly just exists to expose variables to internalRequire
  function internalRequireWrapper (modules, globalCache, sesifyConfig, realm, harden, makeMagicCopy, unsafeEval, unsafeEvalWithEndowments, globalRef) {
    const magicCopyForPackage = new Map()
    const globalStore = new Map()
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
      const packageName = moduleData.package
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
      let moduleSource = `(${moduleData.source})`
      if (moduleData.file) {
        const moduleSourceLabel = `// moduleSource: ${moduleData.file}`
        moduleSource += `\n\n${moduleSourceLabel}`
      }
      const configForModule = getConfigForPackage(sesifyConfig, packageName)
      const isEntryModule = moduleDepPath.length < 1

      // prepare endowments
      const endowmentsFromConfig = generateEndowmentsForConfig(configForModule)
      let endowments = Object.assign({}, sesifyConfig.defaultGlobals, providedEndowments, endowmentsFromConfig)
      // special circular reference for endowments to fix globalRef in SES
      // see https://github.com/Agoric/SES/issues/123
      endowments._endowments = endowments
      // special case for exposing window
      if (endowments.window) {
        endowments = Object.assign({}, endowments.window, endowments)
      }

      const environment = configForModule.environment || (isEntryModule ? 'unfrozen' : 'frozen')
      const runInSes = environment !== 'unfrozen'

      // determine if its a SES-wrapped or naked module initialization
      let moduleInitializer
      if (runInSes) {
        // set the module initializer as the SES-wrapped version
        const moduleRealm = realm.global.Realm.makeCompartment()
        const globalsConfig = configForModule.globals || {}
        prepareRealmGlobalFromConfig(moduleRealm, globalsConfig, endowments)
        // execute in module realm with modified realm global
        try {
          moduleInitializer = moduleRealm.evaluate(`${moduleSource}`)
        } catch (err) {
          console.warn(`Sesify - Error evaluating module "${moduleId}" from package "${packageName}"`)
          throw err
        }
      } else {
        endowments.global = globalRef
        // set the module initializer as the unwrapped version
        moduleInitializer = unsafeEvalWithEndowments(`${moduleSource}`, endowments)
      }
      if (typeof moduleInitializer !== 'function') {
        throw new Error('Sesify - moduleInitializer is not defined correctly')
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
      try {
        moduleInitializer.call(module.exports, scopedRequire, module, module.exports, null, modulesProxy)
      } catch (err) {
        console.warn(`Sesify - Error instantiating module "${moduleId}" from package "${packageName}"`)
        throw err
      }

      const protectedExports = protectExportsInstantiationTime(module.exports, configForModule)
      return protectedExports


      // this is the require method passed to the module initializer
      // it has a context of the current dependency path and nested config
      function scopedRequire (requestedName, providedEndowments) {
        const parentModule = module
        const parentModuleData = moduleData
        return publicRequire({ requestedName, providedEndowments, parentModule, parentModuleData, moduleDepPath })
      }

    }

    function publicRequire ({ requestedName, providedEndowments, parentModule, parentModuleData, moduleDepPath }) {
      const parentPackageName = parentModuleData.package
      const parentModuleId = parentModuleData.id
      const parentModuleDeps = parentModuleData.deps
      const moduleId = parentModuleDeps[requestedName] || requestedName

      if (!(requestedName in parentModuleData.deps)) {
        console.warn(`missing dep: ${parentPackageName} requested ${requestedName}`)
      }

      // recursive requires dont hit cache so it inf loops, so we shortcircuit
      // this only seems to happen with the "timers" which uses and is used by "process"
      if (moduleId === parentModuleId) {
        if (['timers', 'buffer'].includes(requestedName) === false) {
          throw new Error(`Sesify - recursive require detected: "${requestedName}"`)
        }
        return parentModule.exports
      }
      // look up config for module
      const moduleData = modules[moduleId]

      // if we dont have it, throw an error
      // TODO: dedupe this with internalRequire
      if (!moduleData) {
        const err = new Error('Cannot find module \'' + moduleId + '\'')
        err.code = 'MODULE_NOT_FOUND'
        throw err
      }

      const packageName = moduleData.package
      const configForModule = getConfigForPackage(sesifyConfig, packageName)

      // update the dependency path for the child require
      const childDepPath = moduleDepPath.slice()
      childDepPath.push(requestedName)
      // load (or fetch cached) module
      const moduleExports = internalRequire(moduleId, providedEndowments, childDepPath)
      // moduleExports require-time protection
      if (parentPackageName && packageName === parentPackageName) {
        // return raw if same package
        return moduleExports
      } else {
        // return exports protected as specified in config
        return protectExportsRequireTime(parentPackageName, moduleExports, configForModule)
      }
    }

    function protectExportsInstantiationTime (moduleExports, config) {
      // moduleExports instantion-time protection
      const exportsDefense = config.exportsDefense || 'magicCopy'
      switch (exportsDefense) {
        case 'magicCopy':
          // do nothing, handled at import time
          break
        // harden exports
        case 'harden':
          // something breaks if we dont manually harden the prototype
          harden(Reflect.getPrototypeOf(moduleExports))
          harden(moduleExports)
          break
        case 'freeze':
          // Todo: deepFreeze/harden
          Object.freeze(moduleExports)
          break

        default:
          throw new Error(`Sesify - Unknown exports protection ${exportsDefense}`)
      }

      // return the exports
      return moduleExports
    }

    function protectExportsRequireTime (parentPackageName, moduleExports, config) {
      const exportsDefense = config.exportsDefense || 'magicCopy'
      // prepare magicCopy per package
      let magicCopy = magicCopyForPackage.get(parentPackageName)
      if (!magicCopy) {
        magicCopy = makeMagicCopy()
        magicCopyForPackage.set(parentPackageName, magicCopy)
      }
      switch (exportsDefense) {
        case 'magicCopy':
          return magicCopy(moduleExports)
        // already hardened
        case 'harden':
          return magicCopy(moduleExports)
        // already frozen
        case 'freeze':
          return magicCopy(moduleExports)
        default:
          throw new Error(`Sesify - Unknown exports protection ${containment}`)
      }
    }

    function toModuleDepPath (depPath) {
      const moduleDepPath = []
      depPath.forEach((requestedName) => {
        const nameParts = requestedName.split('/')
        let nameInitial = nameParts[0]
        // skip relative resolution
        if (['.','..'].includes(nameInitial)) return
        // fix for scoped module names
        const packageName = nameInitial.includes('@') ? `${nameParts[0]}/${nameParts[1]}` : nameInitial
        // record module name
        moduleDepPath.push(packageName)
      })
      return moduleDepPath
    }

    function getConfigForPackage (config, packageName) {
      const packageConfig = (config.resources || {})[packageName] || {}
      return packageConfig
    }

    function getPackageName (path) {
      const packageName = path.slice(-1)[0] || '<entry>'
      return packageName
    }

    function generateEndowmentsForConfig (config) {
      if (!config.globals) return {}
      const endowments = {}
      Object.entries(config.globals).forEach(([globalPath, configValue]) => {
        // write access handled elsewhere
        if (configValue === 'write') return
        if (configValue !== true) {
          throw new Error('Sesify - unknown value for config globals')
        }
        const value = deepGetAndBind(globalRef, globalPath)
        if (value === undefined) return
        // TODO: actually match prop descriptor
        const propDesc = {
          value,
          configurable: true,
          writable: true,
          enumerable: true,
        }
        deepDefine(endowments, globalPath, propDesc)
      })
      return endowments
    }

    function deepGetAndBind(obj, pathName) {
      const pathParts = pathName.split('.')
      const parentPath = pathParts.slice(0,-1).join('.')
      const childKey = pathParts[pathParts.length-1]
      const parent = parentPath ? deepGet(globalRef, parentPath) : globalRef
      if (!parent) return parent
      const value = parent[childKey]
      if (typeof value === 'function') {
        // bind and copy
        const newValue = value.bind(parent)
        Object.defineProperties(newValue, Object.getOwnPropertyDescriptors(value))
        return newValue
      } else {
        // return as is
        return value
      }
    }

    function deepGet (obj, pathName) {
      let result = obj
      pathName.split('.').forEach(pathPart => {
        if (result === null) {
          result = undefined
          return
        }
        if (result === undefined) {
          return
        }
        result = result[pathPart]
      })
      return result
    }

    function deepDefine (obj, pathName, propDesc) {
      let parent = obj
      const pathParts = pathName.split('.')
      const lastPathPart = pathParts[pathParts.length-1]
      const allButLastPart = pathParts.slice(0,-1)
      allButLastPart.forEach(pathPart => {
        const prevParent = parent
        parent = parent[pathPart]
        if (parent === null) {
          throw new Error('DeepSet - unable to set "'+pathName+'" on null')
        }
        if (parent === undefined) {
          parent = {}
          prevParent[pathPart] = parent
        }
      })
      Object.defineProperty(parent, lastPathPart, propDesc)
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

    function prepareRealmGlobalFromConfig (moduleRealm, globalsConfig, endowments) {
      // lookup top level read + write access keys
      const topLevelWriteAccessKeys = getTopLevelWriteAccessFromPackageConfig(globalsConfig)
      const topLevelReadAccessKeys = getTopLevelReadAccessFromPackageConfig(globalsConfig)
      const globalThisRefs = ['self', 'window', 'globalThis', 'global']
      // define accessors
      const moduleRealmGlobal = moduleRealm.global

      // allow read access via globalStore or moduleRealmGlobal
      topLevelReadAccessKeys.forEach(key => {
        Object.defineProperty(moduleRealmGlobal, key, {
          get () {
            if (globalStore.has(key)) {
              return globalStore.get(key)
            } else {
              return endowments[key]
            }
          },
          set () {
            console.warn(`sesify: ignoring write attempt to read-access global "${key}"`)
          }
        })
      })

      // allow write access to globalStore
      // read access via globalStore or moduleRealmGlobal
      topLevelWriteAccessKeys.forEach(key => {
        Object.defineProperty(moduleRealmGlobal, key, {
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
          configurable: true,
        })
      })

      // set circular globalRefs
      globalThisRefs.forEach(key => {
        // if globalRef is actually an endowment, ignore
        if (topLevelReadAccessKeys.includes(key)) return
        if (topLevelWriteAccessKeys.includes(key)) return
        // set circular ref to global
        moduleRealmGlobal[key] = moduleRealmGlobal
      })
      // support certain globalThis getters
      const origFunction = moduleRealmGlobal.Function
      const newFunction = (src) => {
        return origFunction(src).bind(moduleRealmGlobal)
      }
      Object.defineProperties(newFunction, Object.getOwnPropertyDescriptors(origFunction))
      moduleRealmGlobal.Function = newFunction
    }

    //# sourceURL=internalRequire
  }

})()
