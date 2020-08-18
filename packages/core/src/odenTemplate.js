/* global Compartment */

// oden kernel

// handles
// - loading all modules in importMap graph
// - program state of loaded or not
// - caching of modules
// - creation of execution Compartment
// - cjs

// does NOT handle
// - module loader/resolve logic

class OdenKernel {
  constructor ({
    // whether the dependency graph must be walked and loaded before execution
    dependencyGraphLoaded = false,
    // cache for specifier -> ModuleRecords
    moduleCache = new Map(),
    // top level module to be executed
    entryModules = [],
    // hooks:
    // async hook for loading a moduleId into the cache
    loadModuleHook,
    // setting up a compartment (e.g. modifying globals)
    configureCompartmentHook,
    // allows overriding of imports when relative (e.g. subset or wrapper)
    importRelativeHook = (_, childModuleRecord) => childModuleRecord.exports,
    // called after module intialization has completed
    postExecutionHook = () => {}
  } = {}) {
    this.dependencyGraphLoaded = dependencyGraphLoaded
    this.moduleCache = moduleCache
    this.entryModules = entryModules
    this.loadModuleHook = loadModuleHook
    this.configureCompartmentHook = configureCompartmentHook
    this.importRelativeHook = importRelativeHook
    this.postExecutionHook = postExecutionHook
  }

  execute () {
    // if the dependency graph is already loaded, synchronously execute
    // otherwise asyncly load all modules, then execute
    if (this.dependencyGraphLoaded) {
      // syncly execute
      return this.executeAllModules()
    } else {
      // asyncly load
      return this.loadAllModules().then(() => {
        // then execute
        return this.executeAllModules()
      })
    }
  }

  executeAllModules () {
    // execute entry modules
    this.entryModules.forEach(moduleId => {
      this.executeModule(moduleId)
    })
  }

  async loadAllModules () {
    // load all entry modules, and their children
    return Promise.all(this.entryModules.map(async moduleId => {
      return this.loadModule(moduleId)
    }))
  }

  // load module and all children
  async loadModule (moduleId) {
    if (this.moduleCache.has(moduleId)) {
      return
    }
    const moduleRecord = await this.loadModuleHook(moduleId)
    this.moduleCache.set(moduleId, moduleRecord)
    const childIds = Object.values(moduleRecord.importMap)
    await Promise.all(childIds.map(async (childId) => {
      return this.loadModule(childId)
    }))
  }

  executeModule (moduleId) {
    // TODO: support recursive requires?
    // // browserify goop:
    // // recursive requires dont hit cache so it inf loops, so we shortcircuit
    // // this only seems to happen with a few browserify builtins (nodejs builtin module polyfills)
    // // we could likely allow any requestedName since it can only refer to itself
    // if (moduleId === parentModuleId) {
    //   if (['timers', 'buffer'].includes(requestedName) === false) {
    //     throw new Error(`LavaMoat - recursive require detected: "${requestedName}"`)
    //   }
    //   return parentModuleExports
    // }

    // load module record
    const moduleRecord = this.moduleCache.get(moduleId)
    // if we dont have it, throw an error
    if (!moduleRecord) {
      const err = new Error(`Oden - module missing from module cache "${moduleId}"`)
      err.code = 'MODULE_NOT_FOUND'
      throw err
    }
    // check if it has already been initialized
    if (moduleRecord.isInitialized) {
      const moduleExports = moduleRecord.exports
      return moduleExports
    }
    // prepare moduleInitializer for this module
    const moduleExportsWrapper = { exports: {} }
    const moduleInitializer = this.makeModuleIntializer(moduleRecord)
    moduleInitializer(moduleExportsWrapper)
    // update module record state
    moduleRecord.isInitialized = true
    moduleRecord.exports = moduleExportsWrapper.exports
    // call to hook showing module has completed
    this.postExecutionHook(moduleRecord)
    // return exports
    return moduleExportsWrapper.exports
  }

  makeModuleIntializer (moduleRecord) {
    // allow moduleRecord to have a custom moduleInitializer
    if (moduleRecord.moduleInitializer) {
      return moduleRecord.moduleInitializer
    }
    // prepare execution compartment
    const moduleCompartment = new Compartment()
    this.configureCompartmentHook(moduleRecord, moduleCompartment)
    // execute in module compartment with modified compartment global
    let moduleInitializer
    try {
      const sourceURL = moduleRecord.file || `modules/${moduleRecord.specifier}`
      if (sourceURL.includes('\n')) {
        throw new Error(`Oden - Newlines not allowed in filenames: ${JSON.stringify(sourceURL)}`)
      }
      const moduleSource = moduleRecord.content
      // module intializer
      moduleInitializer = (moduleExportsWrapper) => {
        const commonjsEndowments = {
          module: moduleExportsWrapper,
          exports: moduleExportsWrapper.exports,
          require: (requestedName) => this.importRelative(moduleRecord, requestedName)
        }
        moduleCompartment.evaluate(`${moduleSource}\n//# sourceURL=${sourceURL}`, { endowments: commonjsEndowments })
      }
    } catch (err) {
      console.warn(`Oden - Error evaluating module "${moduleRecord.specifier}"`)
      throw err
    }
    // validate moduleInitializer
    if (typeof moduleInitializer !== 'function') {
      throw new Error(`Oden - moduleInitializer is not defined correctly. got "${typeof moduleInitializer}"`)
    }
    return moduleInitializer
  }

  importRelative (parentModuleRecord, relativeName) {
    const resolvedModuleId = parentModuleRecord.importMap[relativeName]
    if (resolvedModuleId === undefined) {
      const err = new Error(`Oden - relative import failed due to missing entry "${relativeName}" on importMap for module "${parentModuleRecord.specifier}"`)
      err.code = 'MODULE_NOT_FOUND'
      throw err
    }
    // get module exports for child
    this.executeModule(resolvedModuleId)
    const childModuleRecord = this.moduleCache.get(resolvedModuleId)
    // allow moduleExports to be modified by importRelative hook
    const moduleExports = this.importRelativeHook(parentModuleRecord, childModuleRecord)
    return moduleExports
  }
}

module.exports = { OdenKernel }
