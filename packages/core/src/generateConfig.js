const path = require('path')
const through = require('through2')
const fromEntries = require('fromentries')
const jsonStringify = require('json-stable-stringify')
const {
  parse,
  inspectGlobals,
  inspectImports,
  inspectSesCompat,
  utils: { mergeConfig, mapToObj, reduceToTopmostApiCallsFromStrings }
} = require('lavamoat-tofu')

// higher number is less secure, more flexible
const environmentTypes = {
  frozen: 1,
  unfrozen: 2
}

const environmentTypeStrings = {
  1: 'frozen',
  2: 'unfrozen'
}

const defaultEnvironment = environmentTypes.frozen
const rootSlug = '<root>'

module.exports = { rootSlug, createConfigSpy, createModuleInspector }

// createConfigSpy creates a pass-through object stream for the Browserify pipeline.
// it analyses modules for global namespace usages, and generates a config for LavaMoat.
// it calls `onResult` with the config when the stream ends.

function createConfigSpy ({ onResult, isBuiltin }) {
  if (!isBuiltin) throw new Error(`createConfigSpy - must specify "isBuiltin"`)
  const inspector = createModuleInspector({ isBuiltin })
  const configSpy = createSpy(
    // inspect each module
    inspector.inspectModule,
    // after all modules, submit config
    () => onResult(inspector.generateConfig())
  )
  return configSpy
}

function createModuleInspector (opts = {}) {
  const packageToEnvironments = {}
  const packageToGlobals = {}
  const packageToBuiltinImports = {}
  const packageToModules = {}
  const moduleIdToPackageName = {}

  return {
    inspectModule: (moduleData, opts2 = {}) => inspectModule(moduleData, { ...opts, ...opts2 }),
    generateConfig: (opts2 = {}) => generateConfig({ ...opts, ...opts2 })
  }

  function inspectModule (moduleData, { isBuiltin } = {}) {
    const packageName = moduleData.package
    moduleIdToPackageName[moduleData.id] = packageName
    // initialize mapping from package to module
    const packageModules = packageToModules[packageName] = packageToModules[packageName] || {}
    packageModules[moduleData.id] = moduleData
    // skip for root modules (modules not from deps)
    const isRootModule = packageName === rootSlug
    if (isRootModule) return
    // skip builtin modules
    if (moduleData.type === 'builtin') return
    // skip native modules (cant parse)
    if (moduleData.type === 'native') return
    // skip json files
    const filename = moduleData.file || 'unknown'
    const fileExtension = path.extname(filename)
    if (fileExtension !== '.js') return
    // get eval environment
    const ast = moduleData.ast || parse(moduleData.source, {
      // esm support
      sourceType: 'module',
      // someone must have been doing this
      allowReturnOutsideFunction: true,
      errorRecovery: true,
    })
    inspectForEnvironment(ast, packageName)
    // get global usage
    inspectForGlobals(ast, moduleData, packageName)
    // get builtin package usage
    inspectForImports(ast, moduleData, packageName, isBuiltin)
  }

  function inspectForEnvironment (ast, packageName) {
    const { intrinsicMutations: results } = inspectSesCompat(ast, packageName)
    const environment = results.length > 0 ? environmentTypes.unfrozen : environmentTypes.frozen
    // initialize results for package
    const environments = packageToEnvironments[packageName] = packageToEnvironments[packageName] || []
    environments.push(environment)
  }

  function inspectForGlobals (ast, moduleData, packageName) {
    const foundGlobals = inspectGlobals(ast, {
      // browserify commonjs scope
      ignoredRefs: ['require', 'module', 'exports', 'arguments'],
      // browser global refs + browserify global
      globalRefs: ['globalThis', 'self', 'window', 'global']
    })
    // add globalUsage info
    moduleData.globalUsage = mapToObj(foundGlobals)
    // skip if no results
    if (!foundGlobals.size) return
    const packageGlobals = packageToGlobals[packageName]
    if (packageGlobals) {
      // merge maps
      packageToGlobals[packageName] = mergeConfig(packageGlobals, foundGlobals)
    } else {
      // new map
      packageToGlobals[packageName] = foundGlobals
    }
  }

  function inspectForImports (ast, moduleData, packageName, isBuiltin) {
    // get all requested names that resolve to isBuiltin
    const namesForBuiltins = Object.entries(moduleData.deps)
      .filter(([_, resolvedName]) => isBuiltin(resolvedName))
      .map(([requestedName]) => requestedName)
    const { cjsImports } = inspectImports(ast, namesForBuiltins)
    const builtinImports = packageToBuiltinImports[packageName]
    if (builtinImports) {
      // merge maps
      packageToBuiltinImports[packageName] = [...builtinImports, ...cjsImports]
    } else {
      // new map
      packageToBuiltinImports[packageName] = cjsImports
    }
  }

  function generateConfig ({ isBuiltin } = {}) {
    const resources = {}
    const config = { resources }
    Object.entries(packageToModules).forEach(([packageName, packageModules]) => {
      let globals, builtin, packages, environment
      // skip for root modules (modules not from deps)
      const isRootModule = packageName === rootSlug
      if (isRootModule) return
      // get dependencies, ignoring builtins
      const packageDeps = aggregateDeps({ packageModules, moduleIdToPackageName })
        .filter(depPackageName => !isBuiltin(depPackageName))
      if (packageDeps.length) {
        packages = fromEntries(packageDeps.map(depPackageName => [depPackageName, true]))
      }
      // get globals
      if (packageToGlobals[packageName]) {
        globals = mapToObj(packageToGlobals[packageName])
        // prefer "true" over "read" for clearer difference between
        // read/write syntax highlighting
        Object.keys(globals).forEach(key => {
          if (globals[key] === 'read') globals[key] = true
        })
      }
      // get environment
      const environments = packageToEnvironments[packageName]
      if (environments) {
        const bestEnvironment = environments.sort()[environments.length - 1]
        const isDefault = bestEnvironment === defaultEnvironment
        environment = isDefault ? undefined : environmentTypeStrings[bestEnvironment]
      }
      // get core imports
      const builtinImports = packageToBuiltinImports[packageName]
      if (builtinImports && builtinImports.length) {
        builtin = {}
        reduceToTopmostApiCallsFromStrings(builtinImports).forEach(path => {
          builtin[path] = true
        })
      }
      // skip package config if there are no settings needed
      if (!packages && !globals && !environment && !builtin) return
      // create minimal config object
      const config = {}
      if (packages) config.packages = packages
      if (globals) config.globals = globals
      if (environment) config.environment = environment
      if (builtin) config.builtin = builtin
      // set config for package
      resources[packageName] = config
    })

    return config
  }
}

function aggregateDeps ({ packageModules, moduleIdToPackageName }) {
  const deps = new Set()
  Object.values(packageModules).forEach((moduleData) => {
    const newDeps = Object.entries(moduleData.deps)
      .filter(([_, specifier]) => Boolean(specifier))
      .map(([requestedName, specifier]) => moduleIdToPackageName[specifier] || guessPackageName(requestedName))
    newDeps.forEach(dep => deps.add(dep))
    // ensure the package is not listed as its own dependency
    deps.delete(moduleData.package)
  })
  const depsArray = Array.from(deps.values())
  return depsArray
}

// for when you encounter a requestedName that was not inspected, likely because resolution was skipped for that module
function guessPackageName (requestedName) {
  const isNotPackageName = requestedName.startsWith('/') || requestedName.startsWith('.')
  if (isNotPackageName) return `<unknown:${requestedName}>`
  // resolving is skipped so guess package name
  const pathParts = requestedName.split('/')
  const nameSpaced = requestedName.startsWith('@')
  const packagePartCount = nameSpaced ? 2 : 1
  const packageName = pathParts.slice(0, packagePartCount).join('/')
  return packageName
}

function createSpy (onData, onEnd) {
  return through.obj((data, _, cb) => {
    // give data to observer fn
    onData(data)
    // pass the data through normally
    cb(null, data)
  }, (cb) => {
    // call flush observer
    onEnd()
    // End as normal
    cb()
  })
}
