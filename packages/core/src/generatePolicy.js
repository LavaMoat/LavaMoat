// @ts-check

const EventEmitter = require('node:events')
const path = require('node:path')
const jsonStringify = require('json-stable-stringify')
const {
  parse,
  inspectGlobals,
  inspectImports,
  inspectSesCompat,
  codeSampleFromAstNode,
  utils: {
    mergePolicy: mergeGlobalsPolicy,
    mapToObj,
    reduceToTopmostApiCallsFromStrings,
  },
  inspectEsmImports,

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore cycle causes this to be an error sometimes
} = require('lavamoat-tofu')
const { mergePolicy } = require('./mergePolicy')

const rootSlug = '$root$'

/**
 * Symbols that look like globals but aren't; indexed by source type.
 */
const MODULE_REFS = /** @type {const} */ ({
  module: ['arguments', 'import', 'export'],
  script: ['arguments', 'require', 'module', 'exports'],
})

module.exports = { rootSlug, createModuleInspector, getDefaultPaths }

/**
 * @param {ModuleInspectorOptions} opts
 * @returns {ModuleInspector}
 */
function createModuleInspector(opts) {
  const moduleIdToModuleRecord = new Map()
  // "packageToModules" does not include builtin modules
  const packageToModules = new Map()
  const packageToGlobals = new Map()
  /** @type {Map<string, string[]>} */
  const packageToBuiltinImports = new Map()
  /** @type {Map<string, import('./moduleRecord').LavamoatModuleRecord[]>} */
  const packageToNativeModules = new Map()

  /** @type {Map<string, import('./moduleRecord').LavamoatModuleRecord[]>} */
  const packageToDynamicRequires = new Map()

  /** @type {Record<string, import('./schema').DebugInfo>} */
  const debugInfo = {}

  /** @type {ModuleInspector} */
  const inspector = Object.assign(new EventEmitter(), {
    /** @type {InspectModuleFn} */
    inspectModule: (moduleRecord, opts2) => {
      inspectModule(moduleRecord, { ...opts, ...opts2 })
    },
    /** @type {GeneratePolicyFn} */
    generatePolicy: (opts2) => {
      return generatePolicy({ ...opts, ...opts2 })
    },
  })

  return inspector

  /**
   * @param {import('./moduleRecord').LavamoatModuleRecord} moduleRecord
   * @param {ModuleInspectorOptions} opts
   */
  function inspectModule(
    moduleRecord,
    { isBuiltin, includeDebugInfo = false, allowDynamicRequires = false }
  ) {
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
        inspectJsModule(moduleRecord, {
          isBuiltin,
          includeDebugInfo,
          allowDynamicRequires,
        })
        return
      }
      default: {
        const errMsg = `LavaMoat - unknown module type "${type}" for package "${packageName}" module "${specifier}"`
        throw new Error(errMsg)
      }
    }
  }

  /**
   * @param {import('./moduleRecord').LavamoatModuleRecord} moduleRecord
   * @param {Partial<ModuleInspectorOptions>} opts
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function inspectBuiltinModule(moduleRecord, opts) {
    // builtins themselves do not require any configuration
    // packages that import builtins need to add that to their configuration
  }

  /**
   * @param {import('./moduleRecord').LavamoatModuleRecord} moduleRecord
   * @param {Partial<ModuleInspectorOptions>} opts
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function inspectNativeModule(moduleRecord, opts) {
    // LavaMoat does attempt to sandbox native modules
    // packages with native modules need to specify that in the policy file
    const { packageName } = moduleRecord
    if (!packageToNativeModules.has(packageName)) {
      packageToNativeModules.set(packageName, [])
    }
    const packageNativeModules =
      /** @type {import('./moduleRecord').LavamoatModuleRecord[]} */ (
        packageToNativeModules.get(packageName)
      )
    packageNativeModules.push(moduleRecord)
  }

  /**
   * @param {AST} ast
   * @returns {ast is import('@babel/parser').ParseResult<import('@babel/types').File>}
   */
  function isParsedAST(ast) {
    return 'errors' in ast
  }

  /**
   * @param {import('./moduleRecord').LavamoatModuleRecord} moduleRecord
   * @param {ModuleInspectorOptions} opts
   */
  function inspectJsModule(
    moduleRecord,
    { isBuiltin, includeDebugInfo = false, allowDynamicRequires = false }
  ) {
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
      moduleDebug = debugInfo[specifier] = /** @type {any} */ ({})
      // append moduleRecord, ensure ast is not copied
      const debugData = {
        ...moduleRecord,
      }
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
    /**
     * @type {AST}
     * @todo - Put this in `LavamoatModuleRecord` instead
     */
    const ast =
      moduleRecord.ast ||
      parse(/** @type {string} */ (moduleRecord.content), {
        // esm support
        sourceType: 'unambiguous',
        // someone must have been doing this
        allowReturnOutsideFunction: true,
        errorRecovery: true,
      })
    if (includeDebugInfo && isParsedAST(ast) && ast.errors.length) {
      moduleDebug.parseErrors = ast.errors
    }
    // ensure ses compatibility
    inspectForEnvironment(ast, moduleRecord, {
      includeDebugInfo,
      allowDynamicRequires,
    })
    // get global usage
    inspectForGlobals(ast, moduleRecord, packageName, includeDebugInfo)
    // get builtin package usage
    inspectForImports(
      ast,
      moduleRecord,
      packageName,
      isBuiltin,
      includeDebugInfo
    )
    // ensure module ast is cleaned up
    delete moduleRecord.ast
  }

  /**
   * @param {AST} ast
   * @param {import('./moduleRecord').LavamoatModuleRecord} moduleRecord
   * @param {Partial<ModuleInspectorOptions>} options
   * @returns
   */
  function inspectForEnvironment(
    ast,
    moduleRecord,
    { includeDebugInfo = false, allowDynamicRequires = false } = {}
  ) {
    const { packageName } = moduleRecord
    // @ts-expect-error `ParseResult` / `AST` mismatch
    const compatWarnings = inspectSesCompat(ast)

    const { primordialMutations, strictModeViolations, dynamicRequires } =
      // @ts-expect-error `SesCompat` / `InspectSesCompatResult` mismatch
      /** @type {import('./schema').SesCompat} */ (compatWarnings)

    if (allowDynamicRequires && dynamicRequires.length) {
      const dynamicModules = packageToDynamicRequires.get(packageName) ?? []
      dynamicModules.push(moduleRecord)
      packageToDynamicRequires.set(packageName, dynamicModules)
      dynamicRequires.length = 0
    }
    const hasResults =
      primordialMutations.length > 0 ||
      strictModeViolations.length > 0 ||
      dynamicRequires.length > 0
    if (!hasResults) {
      return
    }
    if (includeDebugInfo) {
      const moduleDebug = debugInfo[moduleRecord.specifier]
      moduleDebug.sesCompat = {
        // FIXME: I don't think this is needed, since it appears we overwrite all properties
        ...compatWarnings,
        // fix serialization
        primordialMutations: primordialMutations.map(({ node: { loc } }) => ({
          node: { loc },
        })),
        strictModeViolations: strictModeViolations.map(({ node: { loc } }) => ({
          node: { loc },
        })),
        dynamicRequires: dynamicRequires.map(({ node: { loc } }) => ({
          node: { loc },
        })),
      }
    } else {
      // warn if non-compatible code found
      if (inspector.listenerCount('compat-warning') > 0) {
        inspector.emit('compat-warning', { moduleRecord, compatWarnings })
      } else {
        const samples = jsonStringify({
          primordialMutations: primordialMutations.map(({ node }) =>
            // @ts-expect-error `SesCompatNode` / `Node.loc` mismatch
            codeSampleFromAstNode(node, moduleRecord)
          ),
          strictModeViolations: strictModeViolations.map(({ node }) =>
            // @ts-expect-error `SesCompatNode` / `Node.loc` mismatch
            codeSampleFromAstNode(node, moduleRecord)
          ),
          dynamicRequires: dynamicRequires.map(({ node }) =>
            // @ts-expect-error `SesCompatNode` / `Node.loc` mismatch
            codeSampleFromAstNode(node, moduleRecord)
          ),
        })
        const errMsg = `Incompatible code detected in package "${packageName}" file "${moduleRecord.file}". Violations:\n${samples}`
        console.warn(errMsg)
      }
    }
  }

  /**
   * @param {AST} ast
   * @param {import('./moduleRecord').LavamoatModuleRecord} moduleRecord
   * @param {string} packageName
   * @param {boolean} includeDebugInfo
   */
  function inspectForGlobals(ast, moduleRecord, packageName, includeDebugInfo) {
    const moduleRefs = MODULE_REFS[ast.program.sourceType]

    const globalObjPrototypeRefs = Object.getOwnPropertyNames(Object.prototype)
    const foundGlobals = inspectGlobals(ast, {
      // browserify commonjs scope
      ignoredRefs: [...moduleRefs, ...globalObjPrototypeRefs],
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

  /**
   * @param {AST} ast
   * @param {import('./moduleRecord').LavamoatModuleRecord} moduleRecord
   * @param {string} packageName
   * @param {(value: string) => boolean} isBuiltin
   * @param {boolean} includeDebugInfo
   * @returns
   */
  function inspectForImports(
    ast,
    moduleRecord,
    packageName,
    isBuiltin,
    includeDebugInfo
  ) {
    // get all requested names that resolve to isBuiltin
    const namesForBuiltins = Object.entries(moduleRecord.importMap)
      .filter(([, resolvedName]) => isBuiltin(resolvedName))
      .map(([requestedName]) => requestedName)
    const esmModuleBuiltins = inspectEsmImports(ast, namesForBuiltins)
    const { cjsImports: cjsModuleBuiltins } = inspectImports(
      ast,
      namesForBuiltins
    )
    if (cjsModuleBuiltins.length + esmModuleBuiltins.length === 0) {
      return
    }
    // add debug info
    if (includeDebugInfo) {
      const moduleDebug = debugInfo[moduleRecord.specifier]
      moduleDebug.builtin = [
        ...new Set([...esmModuleBuiltins, ...cjsModuleBuiltins]),
      ]
    }
    // aggregate package builtins
    if (!packageToBuiltinImports.has(packageName)) {
      packageToBuiltinImports.set(packageName, [])
    }
    let packageBuiltins = packageToBuiltinImports.get(packageName) ?? []
    packageBuiltins = [
      ...new Set([
        ...packageBuiltins,
        ...cjsModuleBuiltins,
        ...esmModuleBuiltins,
      ]),
    ]
    packageToBuiltinImports.set(packageName, packageBuiltins)
  }

  /**
   * @type {GeneratePolicyFn}
   */
  function generatePolicy({
    policyOverride,
    includeDebugInfo = false,
    allowDynamicRequires = false,
    moduleToPackageFallback,
  }) {
    /** @type {import('./schema').Resources} */
    const resources = {}
    /**
     * @type {import('./schema').LavaMoatPolicyDebug
     *   | import('./schema').LavaMoatPolicy}
     */
    const policy = { resources }
    packageToModules.forEach((packageModules, packageName) => {
      // the policy fields for each package
      /** @type {import('./schema').ResourcePolicy['globals']} */
      let globals
      /** @type {import('./schema').ResourcePolicy['builtin']} */
      let builtin
      /** @type {import('./schema').ResourcePolicy['packages']} */
      let packages
      /** @type {import('./schema').ResourcePolicy['native']} */
      let native
      /** @type {import('./schema').ResourcePolicy['dynamic']} */
      let dynamic
      // skip for root modules (modules not from deps)
      const isRootModule = packageName === rootSlug
      if (isRootModule) {
        return
      }
      // get dependencies, ignoring builtins
      const packageDeps = aggregateDeps({
        packageModules,
        moduleIdToModuleRecord,
        moduleToPackageFallback,
      })
      if (packageDeps.length) {
        packages = Object.fromEntries(
          packageDeps.map((depPackageName) => [depPackageName, true])
        )
      }
      // get globals
      if (packageToGlobals.has(packageName)) {
        const globalMap = mapToObj(packageToGlobals.get(packageName))
        // prefer "true" over "read" for clearer difference between
        // read/write syntax highlighting
        Object.keys(globalMap).forEach((key) => {
          if (globalMap[key] === 'read') {
            globalMap[key] = true
          }
        })
        globals = globalMap
      }
      // get builtin imports
      const builtinImports = packageToBuiltinImports.get(packageName)
      if (builtinImports && builtinImports.length) {
        /** @type {Record<string, boolean>} */
        const importBuiltin = {}
        const topmostApiCalls = /** @type {string[]} */ (
          reduceToTopmostApiCallsFromStrings(builtinImports)
        )
        topmostApiCalls.forEach((path) => {
          importBuiltin[path] = true
        })
        builtin = importBuiltin
      }
      // get native modules
      native = packageToNativeModules.has(packageName)

      // get dynamic requires
      if (allowDynamicRequires) {
        dynamic = packageToDynamicRequires.has(packageName)
      }
      // skip package policy if there are no settings needed
      if (!packages && !globals && !builtin && !native && !dynamic) {
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
      if (dynamic) {
        packagePolicy.dynamic = dynamic
      }
      // set policy for package
      resources[packageName] = packagePolicy
    })

    // append serializeable debug info
    if (includeDebugInfo) {
      // this is here because we should be using semicolons :D
      // prettier-ignore
      ;(/** @type {import('./schema').LavaMoatPolicyDebug} */(policy).debugInfo = debugInfo)
    }

    // merge override policy
    const mergedPolicy = mergePolicy(policy, policyOverride)
    return mergedPolicy
  }
}

/**
 * @callback ModuleToPackageFallbackFn
 * @param {string} requestedName
 * @returns {string | undefined}
 */

/**
 * @typedef {Object} AggregateDepsOptions
 * @property {Record<string, import('./moduleRecord').LavamoatModuleRecord>} packageModules
 * @property {Map<string, import('./moduleRecord').LavamoatModuleRecord>} moduleIdToModuleRecord
 * @property {ModuleToPackageFallbackFn} [moduleToPackageFallback]
 */

/**
 * @param {AggregateDepsOptions} opts
 * @returns {string[]}
 */
function aggregateDeps({
  packageModules,
  moduleIdToModuleRecord,
  moduleToPackageFallback = guessPackageName,
}) {
  const deps = new Set()
  // get all dep package from the "packageModules" collection of modules
  Object.values(packageModules).forEach((moduleRecord) => {
    Object.entries(moduleRecord.importMap).forEach(
      ([requestedName, specifier]) => {
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
        const packageName =
          moduleToPackageFallback(requestedName) || `<unknown:${requestedName}>`
        deps.add(packageName)
      }
    )
    // ensure the package is not listed as its own dependency
    deps.delete(moduleRecord.packageName)
  })
  // return as array
  const depsArray = Array.from(deps.values())
  return depsArray
}

/**
 * For when you encounter a `requestedName` that was not inspected, likely
 * because resolution was skipped for that module
 *
 * @type {ModuleToPackageFallbackFn}
 */
function guessPackageName(requestedName) {
  const isNotPackageName =
    requestedName.startsWith('/') || requestedName.startsWith('.')
  if (isNotPackageName) {
    return
  }
  // resolving is skipped so guess package name
  const pathParts = requestedName.split('/')
  const nameSpaced = requestedName.startsWith('@')
  const packagePartCount = nameSpaced ? 2 : 1
  const packageName = pathParts.slice(0, packagePartCount).join('/')
  return packageName
}

/**
 * @param {string} policyName
 * @returns
 */
function getDefaultPaths(policyName) {
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

/**
 * @callback GeneratePolicyFn
 * @param {Partial<ModuleInspectorOptions> & {
 *   policyOverride?: import('./schema').LavaMoatPolicyOverrides
 *   moduleToPackageFallback?: (value: string) => string | undefined
 * }} opts
 *
 * @returns {import('./schema').LavaMoatPolicy
 *   | import('./schema').LavaMoatPolicyDebug}
 */

/**
 * @callback InspectModuleFn
 * @param {import('./moduleRecord').LavamoatModuleRecord} moduleRecord
 * @param {Partial<ModuleInspectorOptions>} [opts]
 */

/**
 * @typedef ModuleInspectorOptions
 * @property {(value: string) => boolean} isBuiltin
 * @property {boolean} [includeDebugInfo]
 * @property {(specifier: string) => string | undefined} [moduleToPackageFallback]
 * @property {boolean} [allowDynamicRequires]
 */

/**
 * @typedef ModuleInspectorMembers
 * @property {GeneratePolicyFn} generatePolicy
 * @property {InspectModuleFn} inspectModule
 */

/**
 * @typedef {import('node:events').EventEmitter & ModuleInspectorMembers} ModuleInspector
 */

/**
 * @typedef {import('@babel/parser').ParseResult<import('@babel/types').File>
 *   | import('@babel/types').File} AST
 */
