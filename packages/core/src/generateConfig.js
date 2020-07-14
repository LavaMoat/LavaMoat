const path = require('path')
const through = require('through2')
const fromEntries = require('fromentries')
const jsonStringify = require('json-stable-stringify')
const {
  parse,
  inspectGlobals,
  inspectImports,
  inspectSesCompat,
  codeSampleFromAstNode,
  utils: { mergeConfig, mapToObj, reduceToTopmostApiCallsFromStrings }
} = require('lavamoat-tofu')

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
    const packageName = moduleData.packageName || moduleData.package
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
    // get ast (parse or use cached)
    const ast = moduleData.ast || parse(moduleData.source, {
      // esm support
      sourceType: 'module',
      // someone must have been doing this
      allowReturnOutsideFunction: true,
      errorRecovery: true,
    })
    // ensure ses compatibility
    inspectForEnvironment(ast, moduleData)
    // get global usage
    inspectForGlobals(ast, moduleData, packageName)
    // get builtin package usage
    inspectForImports(ast, moduleData, packageName, isBuiltin)
  }

  function inspectForEnvironment (ast, moduleData) {
    const { package: packageName } = moduleData
    const { primordialMutations, strictModeViolations } = inspectSesCompat(ast, packageName)
    if (primordialMutations.length > 0 || strictModeViolations.length > 0) {
      // adapt moduleData to moduleRecord format
      const moduleRecord = {
        specifier: moduleData.id,
        content: moduleData.source,
        packageName: moduleData.packageName || moduleData.package,
        packageVersion: moduleData.packageVersion,
      }
      const samples = jsonStringify({
        primordialMutations: primordialMutations.map(({ node }) => codeSampleFromAstNode(node, moduleRecord)),
        strictModeViolations: strictModeViolations.map(({ node }) => codeSampleFromAstNode(node, moduleRecord)),
      })
      const errMsg = `Incomptabile code detected in package "${packageName}" file "${moduleData.file}". Violations:\n${samples}`
      throw new Error(errMsg)
    }
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
      let globals, builtin, packages
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
      // get core imports
      const builtinImports = packageToBuiltinImports[packageName]
      if (builtinImports && builtinImports.length) {
        builtin = {}
        reduceToTopmostApiCallsFromStrings(builtinImports).forEach(path => {
          builtin[path] = true
        })
      }
      // skip package config if there are no settings needed
      if (!packages && !globals && !builtin) return
      // create minimal config object
      const config = {}
      if (packages) config.packages = packages
      if (globals) config.globals = globals
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
    try {
      onData(data)
    } catch (err) {
      return cb(err)
    }
    // pass the data through normally
    cb(null, data)
  }, (cb) => {
    // call flush observer
    try {
      onEnd()
    } catch (err) {
      return cb(err)
    }
    // End as normal
    cb()
  })
}
