// @ts-check

const path = require('path')
const fs = require('node:fs/promises')
const { isBuiltin: nodeIsBuiltin, Module } = require('node:module')
const resolve = require('resolve')
const bindings = require('bindings')
const gypBuild = require('node-gyp-build')
const { codeFrameColumns } = require('@babel/code-frame')
const { default: highlight } = require('@babel/highlight')
const {
  loadCanonicalNameMap,
  getPackageNameForModulePath,
} = require('@lavamoat/aa')
const {
  parseForPolicy: coreParseForConfig,
  createModuleInspector,
  LavamoatModuleRecord,
} = require('lavamoat-core')
const {
  parse,
  inspectRequires,
  inspectEsmImports,
  codeSampleFromAstNode,
} = require('lavamoat-tofu')
const { checkForResolutionOverride } = require('./resolutions')
const { fileURLToPath, pathToFileURL } = require('url')

// file extension omitted can be omitted, eg https://npmfs.com/package/yargs/17.0.1/yargs
const commonjsExtensions = ['', '.js', '.cjs']
const resolutionOmittedExtensions = ['.js', '.json']

/**
 * Returns `true` if the specifier is an internal module specifier.
 *
 * @param {string} specifier
 * @returns {boolean}
 */
function isInternal(specifier) {
  return specifier.startsWith('#')
}

/**
 * Returns a "require object" akin to {@link resolve}
 *
 * XXX: Why do we need URL support?
 *
 * @param {URL} url
 */
const createRequire = (url) => {
  return {
    /**
     * This resolver uses the {@link resolve} package first, then falls back to
     * Node.js' builtin resolver.
     *
     * The reason for this is that the `resolve` package does not support
     * `exports`.
     *
     * FIXME: It's theoretically possible for the `resolve` package to resolve
     * the wrong file in a CJS package containing `exports`.
     *
     * @param {string} requestedName
     * @returns {string}
     */
    resolve: (requestedName) => {
      const isInternalImport = isInternal(requestedName)
      const basedir = path.dirname(fileURLToPath(url))

      /** @type {string} */
      let result
      try {
        result = Module.createRequire(url).resolve(requestedName)
      } catch {
        result = resolve.sync(requestedName, {
          basedir,
          extensions: resolutionOmittedExtensions,
        })
      }

      // check for missing builtin modules (e.g. 'worker_threads' in node v10)
      // the "resolve" package resolves as "worker_threads" even if missing
      // XXX Is this needed in Node.js v16+?
      if (!isInternalImport && requestedName === result) {
        const isBuiltinModule = nodeIsBuiltin(result)
        const looksLikeAPath = requestedName.includes('/')
        if (!looksLikeAPath && !isBuiltinModule) {
          const errMsg = `Cannot find module '${requestedName}' from '${basedir}'`
          const err = Object.assign(new Error(errMsg), {
            code: 'MODULE_NOT_FOUND',
          })
          throw err
        }
      }
      // return resolved path
      return result
    },
  }
}

const shouldAlwaysResolve = /** @type {ShouldResolveFn} */ (() => true)

/**
 * @param {ParseForPolicyOptions} opts
 * @returns {Promise<import('lavamoat-core').LavaMoatPolicy>}
 */
async function parseForPolicy({
  projectRoot,
  entryId,
  policyOverride = {},
  shouldResolve,
  includeDebugInfo,
  ...args
}) {
  const isBuiltin = nodeIsBuiltin
  const { resolutions } = policyOverride
  const canonicalNameMap = await loadCanonicalNameMap({
    rootDir: projectRoot,
    includeDevDeps: true,
    resolve: {
      sync: (moduleId, { basedir }) => {
        const { resolve } = createRequire(
          pathToFileURL(path.join(basedir, 'dummy.js'))
        )
        return resolve(moduleId)
      },
    },
  })
  const resolveHook = makeResolveHook({
    projectRoot,
    resolutions,
    canonicalNameMap,
  })
  const importHook = makeImportHook({
    shouldResolve,
    isBuiltin,
    resolveHook,
    canonicalNameMap,
  })
  const moduleSpecifier = resolveHook(
    entryId,
    path.join(projectRoot, 'package.json')
  )

  const inspector = createModuleInspector({ isBuiltin, includeDebugInfo })

  // rich warning output
  inspector.on('compat-warning', displayRichCompatWarning)
  return coreParseForConfig({
    // @ts-expect-error - moduleSpecifier can be null per resolveHook.
    moduleSpecifier,
    importHook,
    isBuiltin,
    inspector,
    policyOverride,
    ...args,
  })
}

/**
 * Creates a resolve hook for a given project root, package.json, and canonical
 * name map.
 *
 * @param {MakeResolveHookParams} params - Parameters; some required
 * @returns {import('lavamoat-core').ResolveFn} - A resolve hook function.
 */
function makeResolveHook({ projectRoot, resolutions = {}, canonicalNameMap }) {
  return (requestedName, referrer) => {
    const parentPackageName = getPackageNameForModulePath(
      canonicalNameMap,
      referrer
    )
    // handle resolution overrides
    const result = checkForResolutionOverride(
      resolutions,
      parentPackageName,
      requestedName
    )
    if (result) {
      // if path is a relative path, it should be relative to the projectRoot
      if (path.isAbsolute(result)) {
        requestedName = result
      } else {
        requestedName = path.resolve(projectRoot, result)
      }
    }

    const { resolve } = createRequire(pathToFileURL(referrer))

    /* eslint-disable no-useless-catch */
    let resolved
    try {
      resolved = resolve(requestedName)
    } catch (err) {
      if (err.code === 'MODULE_NOT_FOUND') {
        console.warn(
          `lavamoat - unable to resolve "${requestedName}" from "${referrer}"`
        )
      }
      // return "null" to mean failed to resolve
      return null
    }
    return resolved
  }
}

/**
 * Creates an import hook function passed into `lavamoat-core` for policy
 * generation
 *
 * @remarks
 * `policyOverride` is not provided anywhere in the codebase.
 * @param {MakeImportHookParams} params
 * @returns {import('lavamoat-core').ImportHookFn} An import hook function.
 */
function makeImportHook({
  isBuiltin,
  resolveHook,
  shouldResolve = shouldAlwaysResolve,
  canonicalNameMap,
  policyOverride,
}) {
  return async (specifier) => {
    // see if its a builtin
    if (isBuiltin(specifier)) {
      return makeBuiltinModuleRecord(specifier)
    }

    // assume specifier is filename
    const filename = specifier
    const extension = path.extname(filename)
    const packageName = getPackageNameForModulePath(canonicalNameMap, filename)

    if (commonjsExtensions.includes(extension)) {
      return makeJsModuleRecord(specifier, filename, packageName)
    }
    if (extension === '.node') {
      return makeNativeModuleRecord(specifier, filename, packageName)
    }
    if (extension === '.json') {
      return makeJsonModuleRecord(specifier, filename, packageName)
    }
    throw new Error(
      `lavamoat-node/makeImportHook - unknown module file extension "${extension}" in filename "${filename}"`
    )
  }

  /**
   * Creates a new {@link LavamoatModuleRecord} for a built-in Node.js module.
   *
   * @param {string} specifier - The name of the built-in module.
   * @returns {LavamoatModuleRecord} A new LavamoatModuleRecord instance.
   */
  function makeBuiltinModuleRecord(specifier) {
    return new LavamoatModuleRecord({
      type: 'builtin',
      specifier,
      file: `builtin/${specifier}`,
      packageName: specifier,
      // special module initializer that directly accesses node's require
      moduleInitializer: (moduleExportsWrapper) => {
        moduleExportsWrapper.exports = require(specifier)
      },
    })
  }

  /**
   * Creates a new {@link LavamoatModuleRecord} object for a native module.
   *
   * @param {string} specifier - The module specifier.
   * @param {string} filename - The filename of the module.
   * @param {string} packageName - The name of the package the module belongs
   *   to.
   * @returns {LavamoatModuleRecord} A new LavamoatModuleRecord object.
   */
  function makeNativeModuleRecord(specifier, filename, packageName) {
    return new LavamoatModuleRecord({
      type: 'native',
      specifier,
      file: filename,
      packageName,
      // special module initializer that directly accesses node's require
      moduleInitializer: (moduleExportsWrapper) => {
        moduleExportsWrapper.exports = require(specifier)
      },
    })
  }
  /**
   * Creates a JS module record.
   *
   * @param {string} specifier - The module specifier.
   * @param {string} filename - The filename of the module.
   * @param {string} packageName - The name of the package.
   * @returns {Promise<LavamoatModuleRecord>} A promise that resolves to a
   *   LavamoatModuleRecord object.
   */
  async function makeJsModuleRecord(specifier, filename, packageName) {
    // load src
    const content = await fs.readFile(filename, 'utf8')
    // parse
    const ast = parseModule(content, specifier)
    // get imports
    const esmImports = inspectEsmImports(ast)
    const { cjsImports } = inspectRequires(ast, undefined, false)

    const imports = [...new Set([...esmImports, ...cjsImports])]

    // build import map
    const importMap = /** @type {Record<string, string | null>} */ (
      Object.fromEntries(
        imports.map((requestedName) => {
          let depValue
          if (shouldResolve(requestedName, specifier)) {
            try {
              depValue = resolveHook(requestedName, specifier)
            } catch (err) {
              // graceful failure
              console.warn(
                `lavamoat-node/makeJsModuleRecord - could not resolve "${requestedName}" from "${specifier}"`
              )
              depValue = null
            }
          } else {
            // resolving is skipped so put in a dummy value
            depValue = null
          }
          return [requestedName, depValue]
        })
      )
    )

    // add policyOverride additions to import map (policy gen only)
    const policyOverrideImports = Object.keys(
      policyOverride?.resources?.[packageName]?.packages ?? {}
    )
    await Promise.all(
      policyOverrideImports.map(async (packageName) => {
        // skip if there is already an entry for the name
        if (packageName in importMap) {
          return
        }
        // resolve and add package main in override
        const packageRoot = getMapKeyForValue(canonicalNameMap, packageName)
        const packageJson = JSON.parse(
          await fs.readFile(path.join(packageRoot, 'package.json'), 'utf8')
        )
        const main = packageJson.main ?? 'index.js'
        const mainPath = path.resolve(packageRoot, main)
        importMap[packageName] = mainPath
      })
    )

    handleNativeModules(filename, importMap)

    return new LavamoatModuleRecord({
      type: 'js',
      specifier,
      file: filename,
      packageName,
      content,
      // @ts-expect-error I guess the values can be null??
      importMap,
      ast,
    })
  }

  async function makeJsonModuleRecord(specifier, filename, packageName) {
    // load src
    const rawContent = await fs.readFile(filename, 'utf8')
    // validate json
    JSON.parse(rawContent)
    // wrap as commonjs module
    const cjsContent = `module.exports=${rawContent}`
    return new LavamoatModuleRecord({
      type: 'js',
      specifier,
      file: filename,
      packageName,
      content: cjsContent,
    })
  }

  /**
   * Detects common dynamically imported native modules and adds them to the
   * import map
   *
   * @param {string} filename - The name of the file.
   * @param {Record<string, string | null>} importMap - The import map object.
   */
  function handleNativeModules(filename, importMap) {
    // heuristics for detecting common dynamically imported native modules
    // important for generating a working config for apps with native modules
    if (importMap.bindings) {
      // detect native modules using "bindings" package
      try {
        const packageDir = bindings.getRoot(filename)
        const nativeModulePath = bindings({
          // @ts-expect-error - this option is undocumented or does nothing
          path: true,
          module_root: packageDir,
        })
        importMap[nativeModulePath] = nativeModulePath
      } catch (err) {
        // ignore resolution failures
        if (!err.message.includes('Could not locate the bindings file')) {
          throw err
        }
      }
    }
    if (importMap['node-gyp-build']) {
      // detect native modules using "node-gyp-build" package
      try {
        const packageDir = bindings.getRoot(filename)
        const nativeModulePath = gypBuild.path(packageDir)
        importMap[nativeModulePath] = nativeModulePath
      } catch (err) {
        // ignore resolution failures
        if (!err.message.includes('No native build was found')) {
          throw err
        }
      }
    }
  }
}

function parseModule(moduleSrc, filename = '<unknown file>') {
  let ast
  try {
    // transformFromAstAsync
    ast = parse(moduleSrc, {
      // esm support
      sourceType: 'unambiguous',
      // someone must have been doing this
      allowReturnOutsideFunction: true,
      // plugins: [
      //   '@babel/plugin-transform-literals',
      //   // '@babel/plugin-transform-reserved-words',
      //   // '@babel/plugin-proposal-class-properties',
      // ]
      errorRecovery: true,
    })
  } catch (err) {
    const newErr = Object.assign(
      new Error(`Failed to parse file "${filename}": ${err.stack}`),
      { file: filename, prevErr: err }
    )
    throw newErr
  }
  return ast
}

function displayRichCompatWarning({ moduleRecord, compatWarnings }) {
  const { packageName, file } = moduleRecord
  const { primordialMutations, strictModeViolations, dynamicRequires } =
    compatWarnings
  console.warn(
    `⚠️  Potentially Incompatible code detected in package "${packageName}" file "${file}":`
  )
  const highlightedCode = highlight(moduleRecord.content)
  logWarnings('primordial mutation', primordialMutations)
  logWarnings('dynamic require', dynamicRequires)
  logErrors('strict mode violation', strictModeViolations)

  function logWarnings(message, sites) {
    sites.forEach(({ node }) => {
      const { npmfs } = codeSampleFromAstNode(node, moduleRecord)
      if (npmfs) {
        console.warn(`  link: ${npmfs}`)
      }
      const output = codeFrameColumns(highlightedCode, node.loc, { message })
      console.warn(output)
    })
  }

  function logErrors(category, sites) {
    sites.forEach(({ loc, error }) => {
      const range = { start: loc }
      const { npmfs } = codeSampleFromAstNode({ loc: range }, moduleRecord)
      if (npmfs) {
        console.warn(`  link: ${npmfs}`)
      }
      const message = `${category}: ${error.message}`
      const output = codeFrameColumns(highlightedCode, range, { message })
      console.warn(output)
    })
  }
}

function getMapKeyForValue(map, searchValue) {
  for (let [key, value] of map.entries()) {
    if (value === searchValue) {
      return key
    }
  }
}

module.exports = {
  parseForPolicy,
  makeResolveHook,
  makeImportHook,
  resolutionOmittedExtensions,
}

/**
 * @typedef MakeResolveHookParams
 * @property {string} projectRoot
 * @property {import('@lavamoat/aa').CanonicalNameMap} canonicalNameMap
 * @property {import('lavamoat-core').Resolutions} [resolutions]
 */

/**
 * @typedef ParseForPolicyOptions
 * @property {string} projectRoot
 * @property {string} entryId
 * @property {import('lavamoat-core').LavaMoatPolicyOverrides} [policyOverride]
 * @property {(requestedName?: string, specifier?: string) => boolean} [shouldResolve]
 * @property {boolean} [includeDebugInfo]
 * @property {import('lavamoat-core').IsBuiltinFn} [isBuiltin]
 */

/**
 * @remarks
 * This is essentially the same as `ShouldImportFn` in `lavamoat-core`, but has
 * a different semantic meaning.
 * @callback ShouldResolveFn
 * @param {string} [requestedName]
 * @param {string} [specifier]
 * @returns {boolean}
 */

/**
 * @typedef MakeImportHookParams
 * @property {import('lavamoat-core').ResolveFn} resolveHook
 * @property {import('lavamoat-core').IsBuiltinFn} isBuiltin
 * @property {import('@lavamoat/aa').CanonicalNameMap} canonicalNameMap
 * @property {import('lavamoat-core').LavaMoatPolicyOverrides} [policyOverride]
 * @property {ShouldResolveFn} [shouldResolve]
 */
