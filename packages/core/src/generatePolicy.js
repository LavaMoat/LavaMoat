const EventEmitter = require('events')
const path = require('path')
const jsonStringify = require('json-stable-stringify')
const {
  parse,
  inspectGlobals,
  inspectImports,
  inspectSesCompat,
  codeSampleFromAstNode,
  utils: { mergePolicy: mergeGlobalsPolicy, mapToObj, reduceToTopmostApiCallsFromStrings },
} = require('lavamoat-tofu')
const { mergePolicy } = require('./mergePolicy')

const rootSlug = '$root$'

module.exports = { rootSlug, createModuleInspector, getDefaultPaths }

function createModuleInspector (opts = {}) {
  const moduleIdToModuleRecord = new Map()
  // "packageToModules" does not include builtin modules
  const packageToModules = new Map()
  const packageToGlobals = new Map()
  const packageToBuiltinImports = new Map()
  const packageToNativeModules = new Map()
  const debugInfo = {}

  const inspector = new EventEmitter()
  inspector.inspectModule = (moduleRecord, opts2 = {}) => {
    inspectModule(moduleRecord, { ...opts, ...opts2 })
  }
  inspector.generatePolicy = (opts2 = {}) => {
    return generatePolicy({ ...opts, ...opts2 })
  }

  return inspector

  function inspectModule (moduleRecord, { isBuiltin, includeDebugInfo = false } = {}) {
    const { packageName, specifier, type } = moduleRecord
    // record the module
    moduleIdToModuleRecord.set(specifier, moduleRecord)
    // call the correct analyzer for the module type
    switch (type) {
      case 'builtin': {
        inspectBuiltinModule(moduleRecord, { includeDebugInfo })
        return
      }
      case 'native': {
        inspectNativeModule(moduleRecord, { includeDebugInfo })
        return
      }
      case 'js': {
        inspectJsModule(moduleRecord, { isBuiltin, includeDebugInfo })
        return
      }
      default: {
        const errMsg = `LavaMoat - unknown module type "${type}" for package "${packageName}" module "${specifier}"`
        throw new Error(errMsg)
      }
    }
  }

  function inspectBuiltinModule (moduleRecord) {
    // builtins themselves do not require any configuration
    // packages that import builtins need to add that to their configuration
  }

  function inspectNativeModule (moduleRecord) {
    // LavaMoat does attempt to sandbox native modules
    // packages with native modules need to specify that in the policy file
    const { packageName } = moduleRecord
    if (!packageToNativeModules.has(packageName)) {
      packageToNativeModules.set(packageName, [])
    }
    const packageNativeModules = packageToNativeModules.get(packageName)
    packageNativeModules.push(moduleRecord)
  }

  function inspectJsModule (moduleRecord, { isBuiltin, includeDebugInfo = false }) {
    const { packageName, specifier } = moduleRecord
    let moduleDebug
    // record the module
    moduleIdToModuleRecord.set(specifier, moduleRecord)
    // initialize mapping from package to module
    if (!packageToModules.has(packageName)) {
      packageToModules.set(packageName, new Map())
    }
    const packageModules = packageToModules.get(packageName)
    packageModules[specifier] = moduleRecord
    // initialize module debug info
    if (includeDebugInfo) {
      moduleDebug = debugInfo[specifier] = {}
      // append moduleRecord, ensure ast is not copied
      const debugData = { ...moduleRecord }
      delete debugData.ast
      moduleDebug.moduleRecord = debugData
    }
    // skip for root modules (modules not from deps)
    const isRootModule = packageName === rootSlug
    if (isRootModule) {
      return
    }
    // skip json files
    const filename = moduleRecord.file || 'unknown'
    const fileExtension = path.extname(filename)
    if (!fileExtension.match(/^\.([cm]?js|ts)$/)) {
      return
    }
    // get ast (parse or use cached)
    const ast = moduleRecord.ast || parse(moduleRecord.content, {
      // esm support
      sourceType: 'module',
      // someone must have been doing this
      allowReturnOutsideFunction: true,
      errorRecovery: true,
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
    // ensure module ast is cleaned up
    delete moduleRecord.ast
  }

  function inspectForEnvironment (ast, moduleRecord, includeDebugInfo) {
    const { packageName } = moduleRecord
    const compatWarnings = inspectSesCompat(ast, packageName)
    const { primordialMutations, strictModeViolations, dynamicRequires } = compatWarnings
    const hasResults = primordialMutations.length > 0 || strictModeViolations.length > 0 || dynamicRequires.length > 0
    if (!hasResults) {
      return
    }
    if (includeDebugInfo) {
      const moduleDebug = debugInfo[moduleRecord.specifier]
      moduleDebug.sesCompat = {
        ...compatWarnings,
        // fix serialization
        primordialMutations: primordialMutations.map(({ node: { loc } }) => ({ node: { loc } })),
        strictModeViolations: strictModeViolations.map(({ node: { loc } }) => ({ node: { loc } })),
        dynamicRequires: dynamicRequires.map(({ node: { loc } }) => ({ node: { loc } })),
      }
    } else {
      // warn if non-compatible code found
      if (inspector.listenerCount('compat-warning') > 0) {
        inspector.emit('compat-warning', { moduleRecord, compatWarnings })
      } else {
        const samples = jsonStringify({
          primordialMutations: primordialMutations.map(({ node }) => codeSampleFromAstNode(node, moduleRecord)),
          strictModeViolations: strictModeViolations.map(({ node }) => codeSampleFromAstNode(node, moduleRecord)),
          dynamicRequires: dynamicRequires.map(({ node }) => codeSampleFromAstNode(node, moduleRecord)),
        })
        const errMsg = `Incompatible code detected in package "${packageName}" file "${moduleRecord.file}". Violations:\n${samples}`
        console.warn(errMsg)
      }
    }
  }

  function inspectForGlobals (ast, moduleRecord, packageName, includeDebugInfo) {
    const commonJsRefs = ['require', 'module', 'exports', 'arguments']
    const globalObjPrototypeRefs = Object.getOwnPropertyNames(Object.prototype)
    const foundGlobals = inspectGlobals(ast, {
      // browserify commonjs scope
      ignoredRefs: [...commonJsRefs, ...globalObjPrototypeRefs],
      // browser global refs + browserify global
      globalRefs: ['globalThis', 'self', 'window', 'global'],
    })
    // skip if no results
    if (!foundGlobals.size) {
      return
    }
    // add debug info
    if (includeDebugInfo) {
      const moduleDebug = debugInfo[moduleRecord.specifier]
      moduleDebug.globals = mapToObj(foundGlobals)
    }
    // agregate globals
    if (!packageToGlobals.has(packageName)) {
      packageToGlobals.set(packageName, [])
    }
    let packageGlobals = packageToGlobals.get(packageName)
    packageGlobals = mergeGlobalsPolicy(packageGlobals, foundGlobals)
    packageToGlobals.set(packageName, packageGlobals)
  }

  function inspectForImports (ast, moduleRecord, packageName, isBuiltin, includeDebugInfo) {
    // get all requested names that resolve to isBuiltin
    const namesForBuiltins = Object.entries(moduleRecord.importMap)
      .filter(([_, resolvedName]) => isBuiltin(resolvedName))
      .map(([requestedName]) => requestedName)
    const { cjsImports: moduleBuiltins } = inspectImports(ast, namesForBuiltins)
    if (!moduleBuiltins.length) {
      return
    }
    // add debug info
    if (includeDebugInfo) {
      const moduleDebug = debugInfo[moduleRecord.specifier]
      moduleDebug.builtin = moduleBuiltins
    }
    // aggregate package builtins
    if (!packageToBuiltinImports.has(packageName)) {
      packageToBuiltinImports.set(packageName, [])
    }
    let packageBuiltins = packageToBuiltinImports.get(packageName)
    packageBuiltins = [...packageBuiltins, ...moduleBuiltins]
    packageToBuiltinImports.set(packageName, packageBuiltins)
  }

  function generatePolicy ({ policyOverride, includeDebugInfo } = {}) {
    const resources = {}
    const policy = { resources }
    packageToModules.forEach((packageModules, packageName) => {
      // the policy fields for each package
      let globals, builtin, packages, native
      // skip for root modules (modules not from deps)
      const isRootModule = packageName === rootSlug
      if (isRootModule) {
        return
      }
      // get dependencies, ignoring builtins
      const packageDeps = aggregateDeps({ packageModules, moduleIdToModuleRecord })
      if (packageDeps.length) {
        packages = Object.fromEntries(packageDeps.map(depPackageName => [depPackageName, true]))
      }
      // get globals
      if (packageToGlobals.has(packageName)) {
        globals = mapToObj(packageToGlobals.get(packageName))
        // prefer "true" over "read" for clearer difference between
        // read/write syntax highlighting
        Object.keys(globals).forEach(key => {
          if (globals[key] === 'read') {
            globals[key] = true
          }
        })
      }
      // get builtin imports
      const builtinImports = packageToBuiltinImports.get(packageName)
      if (builtinImports && builtinImports.length) {
        builtin = {}
        reduceToTopmostApiCallsFromStrings(builtinImports).forEach(path => {
          builtin[path] = true
        })
      }
      // get native modules
      native = packageToNativeModules.has(packageName)
      // skip package policy if there are no settings needed
      if (!packages && !globals && !builtin) {
        return
      }
      // create minimal policy object
      const packagePolicy = {}
      if (packages) {
        packagePolicy.packages = packages
      }
      if (globals) {
        packagePolicy.globals = globals
      }
      if (builtin) {
        packagePolicy.builtin = builtin
      }
      if (native) {
        packagePolicy.native = native
      }
      // set policy for package
      resources[packageName] = packagePolicy
    })

    // append serializeable debug info
    if (includeDebugInfo) {
      policy.debugInfo = debugInfo
    }

    // merge override policy
    const mergedPolicy = mergePolicy(policy, policyOverride)
    return mergedPolicy
  }
}

function aggregateDeps ({ packageModules, moduleIdToModuleRecord }) {
  const deps = new Set()
  // get all dep package from the "packageModules" collection of modules
  Object.values(packageModules).forEach((moduleRecord) => {
    Object.entries(moduleRecord.importMap).forEach(([requestedName, specifier]) => {
      // skip entries where resolution was skipped
      if (!specifier) {
        return
      }
      // get packageName from module record, or guess
      const moduleRecord = moduleIdToModuleRecord.get(specifier)
      if (moduleRecord) {
        // builtin modules are ignored here, handled elsewhere
        if (moduleRecord.type === 'builtin') {
          return
        }
        deps.add(moduleRecord.packageName)
        return
      }
      // moduleRecord missing, guess package name
      const packageName = guessPackageName(requestedName)
      deps.add(packageName)
    })
    // ensure the package is not listed as its own dependency
    deps.delete(moduleRecord.packageName)
  })
  // return as array
  const depsArray = Array.from(deps.values())
  return depsArray
}

// for when you encounter a requestedName that was not inspected, likely because resolution was skipped for that module
function guessPackageName (requestedName) {
  const isNotPackageName = requestedName.startsWith('/') || requestedName.startsWith('.')
  if (isNotPackageName) {
    return `<unknown:${requestedName}>`
  }
  // resolving is skipped so guess package name
  const pathParts = requestedName.split('/')
  const nameSpaced = requestedName.startsWith('@')
  const packagePartCount = nameSpaced ? 2 : 1
  const packageName = pathParts.slice(0, packagePartCount).join('/')
  return packageName
}

function getDefaultPaths (policyName) {
  const policiesDir = 'lavamoat'
  const policyDir = path.join(policiesDir, policyName)
  return {
    policiesDir,
    policyDir,
    primary: path.join(policyDir, 'policy.json'),
    override: path.join(policyDir, 'policy-override.json'),
    debug: path.join(policyDir, 'policy-debug.json'),
  }
}
