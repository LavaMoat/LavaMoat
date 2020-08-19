const path = require('path')
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

module.exports = { rootSlug, createModuleInspector }

function createModuleInspector (opts = {}) {
  const packageToGlobals = {}
  const packageToBuiltinImports = {}
  const packageToModules = {}
  const moduleIdToPackageName = {}
  const debugInfo = {}

  return {
    inspectModule: (moduleRecord, opts2 = {}) => inspectModule(moduleRecord, { ...opts, ...opts2 }),
    generateConfig: (opts2 = {}) => generateConfig({ ...opts, ...opts2 })
  }

  function inspectModule (moduleRecord, { isBuiltin, includeDebugInfo = false } = {}) {
    let moduleDebug
    const packageName = moduleRecord.packageName
    moduleIdToPackageName[moduleRecord.specifier] = packageName
    // initialize mapping from package to module
    const packageModules = packageToModules[packageName] = packageToModules[packageName] || {}
    packageModules[moduleRecord.specifier] = moduleRecord
    // initialize module debug info
    if (includeDebugInfo) {
      moduleDebug = debugInfo[moduleRecord.specifier] = {}
      // append moduleRecord, ensure ast is not copied
      const debugData = { ...moduleRecord }
      delete debugData.ast
      moduleDebug.moduleRecord = debugData
    }
    // skip for root modules (modules not from deps)
    const isRootModule = packageName === rootSlug
    if (isRootModule) return
    // skip builtin modules
    if (moduleRecord.type === 'builtin') return
    // skip native modules (cant parse)
    if (moduleRecord.type === 'native') return
    // skip json files
    const filename = moduleRecord.file || 'unknown'
    const fileExtension = path.extname(filename)
    if (fileExtension !== '.js') return
    // get ast (parse or use cached)
    const ast = moduleRecord.ast || parse(moduleRecord.content, {
      // esm support
      sourceType: 'module',
      // someone must have been doing this
      allowReturnOutsideFunction: true,
      errorRecovery: true
    })
    if (includeDebugInfo && ast.errors && ast.errors.length) {
      moduleDebug.parseErrors = ast.errors
    }
    // ensure ses compatibility
    inspectForEnvironment(ast, moduleRecord, includeDebugInfo)
    // get global usage
    inspectForGlobals(ast, moduleRecord, packageName, includeDebugInfo)
    // get builtin package usage
    inspectForImports(ast, moduleRecord, packageName, isBuiltin, includeDebugInfo)
  }

  function inspectForEnvironment (ast, moduleRecord, includeDebugInfo) {
    const { packageName } = moduleRecord
    const sesCompat = inspectSesCompat(ast, packageName)
    const { primordialMutations, strictModeViolations, dynamicRequires } = sesCompat
    const hasResults = primordialMutations.length > 0 || strictModeViolations.length > 0 || dynamicRequires.length > 0
    if (!hasResults) return
    if (includeDebugInfo) {
      const moduleDebug = debugInfo[moduleRecord.specifier]
      moduleDebug.sesCompat = {
        ...sesCompat,
        // fix serialization
        primordialMutations: primordialMutations.map(({ node: { loc } }) => ({ node: { loc } })),
        strictModeViolations: strictModeViolations.map(({ node: { loc } }) => ({ node: { loc } })),
        dynamicRequires: dynamicRequires.map(({ node: { loc } }) => ({ node: { loc }}))
      }
    } else {
      // warn if non-compatible code found
      const samples = jsonStringify({
        primordialMutations: primordialMutations.map(({ node }) => codeSampleFromAstNode(node, moduleRecord)),
        strictModeViolations: strictModeViolations.map(({ node }) => codeSampleFromAstNode(node, moduleRecord)),
        dynamicRequires: dynamicRequires.map(({ node }) => codeSampleFromAstNode(node, moduleRecord))
      })
      const errMsg = `Incomptabile code detected in package "${packageName}" file "${moduleRecord.file}". Violations:\n${samples}`
      console.warn(errMsg)
    }
  }

  function inspectForGlobals (ast, moduleRecord, packageName, includeDebugInfo) {
    const foundGlobals = inspectGlobals(ast, {
      // browserify commonjs scope
      ignoredRefs: ['require', 'module', 'exports', 'arguments'],
      // browser global refs + browserify global
      globalRefs: ['globalThis', 'self', 'window', 'global']
    })
    // skip if no results
    if (!foundGlobals.size) return
    // add debug info
    if (includeDebugInfo) {
      const moduleDebug = debugInfo[moduleRecord.specifier]
      moduleDebug.globals = mapToObj(foundGlobals)
    }
    // agregate globals
    let packageGlobals = packageToGlobals[packageName] || []
    packageGlobals = mergeConfig(packageGlobals, foundGlobals)
    packageToGlobals[packageName] = packageGlobals
  }

  function inspectForImports (ast, moduleRecord, packageName, isBuiltin, includeDebugInfo) {
    // get all requested names that resolve to isBuiltin
    const namesForBuiltins = Object.entries(moduleRecord.importMap)
      .filter(([_, resolvedName]) => isBuiltin(resolvedName))
      .map(([requestedName]) => requestedName)
    const { cjsImports: moduleBuiltins } = inspectImports(ast, namesForBuiltins)
    if (!moduleBuiltins.length) return
    // add debug info
    if (includeDebugInfo) {
      const moduleDebug = debugInfo[moduleRecord.specifier]
      moduleDebug.builtin = moduleBuiltins
    }
    // agregate package builtins
    let packageBuiltins = packageToBuiltinImports[packageName] || []
    packageBuiltins = [...packageBuiltins, ...moduleBuiltins]
    packageToBuiltinImports[packageName] = packageBuiltins
  }

  function generateConfig ({ isBuiltin, includeDebugInfo } = {}) {
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

    // append serializeable debug info
    if (includeDebugInfo) {
      config.debugInfo = debugInfo
    }

    return config
  }
}

function aggregateDeps ({ packageModules, moduleIdToPackageName }) {
  const deps = new Set()
  Object.values(packageModules).forEach((moduleRecord) => {
    const newDeps = Object.entries(moduleRecord.importMap)
      .filter(([_, specifier]) => Boolean(specifier))
      .map(([requestedName, specifier]) => moduleIdToPackageName[specifier] || guessPackageName(requestedName))
    newDeps.forEach(dep => deps.add(dep))
    // ensure the package is not listed as its own dependency
    deps.delete(moduleRecord.packageName)
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
