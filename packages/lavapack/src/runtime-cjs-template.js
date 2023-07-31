// eslint-disable-next-line no-extra-semi
;(function() {
  function getGlobalRef () {
    if (typeof globalThis !== 'undefined') {
      return globalThis
    }
    const globalRef = typeof self !== 'undefined' ? self : (typeof global !== 'undefined' ? global : undefined)
    if (typeof globalRef !== 'undefined') {
      console.error('LavaMoat - Deprecation Warning: global reference is expected as `globalThis`')
    }
  }

  const globalRef = getGlobalRef()

  if (!globalRef) {
    throw new Error('Lavamoat - globalThis not defined')
  }

  // polyfill globalThis
  if (globalRef.globalThis !== globalRef) {
    globalRef.globalThis = globalRef
  }
  // polyfill node/browserify's globalRef
  if (globalRef.global !== globalRef) {
    globalRef.global = globalRef
  }

  const {strictScopeTerminator} = templateRequire('strict-scope-terminator')

  const moduleRegistry = new Map()
  const moduleCache = new Map()

  // create a lavamoat pulic API for loading modules over multiple files
  const LavaPack = Object.freeze({
    loadPolicy: Object.freeze(loadPolicy),
    loadBundle: Object.freeze(loadBundle),
    runModule: Object.freeze(runModule),
  })

  Object.defineProperty(globalRef, 'LavaPack', {value: LavaPack})

  function loadPolicy () {
    throw new Error('runtime-cjs: unable to enforce policy')
  }

  // it is called by the modules collection that will be appended to this file
  // eslint-disable-next-line no-unused-vars
  function loadBundle (newModules, entryPoints, bundlePolicy) {
    // ignore bundlePolicy as we wont be enforcing it
    // verify + load in each module
    for (const [moduleId, moduleDeps, initFn] of newModules) {
      // verify that module is new
      if (moduleRegistry.has(moduleId)) {
        throw new Error(`LavaMoat - loadBundle encountered redundant module definition for id "${moduleId}"`)
      }
      // add the module
      moduleRegistry.set(moduleId, { deps: moduleDeps, precompiledInitializer: initFn })
    }
    // run each of entryPoints
    const entryExports = Array.prototype.map.call(entryPoints, (entryId) => {
      return runModule(entryId)
    })
    // webpack compat: return the first module's exports
    return entryExports[0]
  }

  function runModule (moduleId) {
    if (!moduleRegistry.has(moduleId)) {
      throw new Error(`no module registered for "${moduleId}" (${typeof moduleId})`)
    }
    if (moduleCache.has(moduleId)) {
      const moduleObject = moduleCache.get(moduleId)
      return moduleObject.exports
    }
    const moduleObject = { exports: {} }
    const evalKit = {
      scopeTerminator: strictScopeTerminator,
      globalThis: globalRef,
    }
    moduleCache.set(moduleId, moduleObject)
    const moduleData = moduleRegistry.get(moduleId)
    const localRequire = requireRelative.bind(null, moduleId, moduleData)
    const { precompiledInitializer } = moduleData
    // this invokes the with-proxy wrapper (proxy replace by start compartment global)
    const moduleInitializerFactory = precompiledInitializer.call(evalKit)
    // this ensures strict mode
    const moduleInitializer = moduleInitializerFactory()
    moduleInitializer.call(moduleObject.exports, localRequire, moduleObject, moduleObject.exports)
    return moduleObject.exports
  }

  function requireRelative (parentId, parentData, requestedName) {
    const resolvedId = (parentData.deps || {})[requestedName] || requestedName
    return runModule(resolvedId)
  }

})()
