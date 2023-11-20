const path = require('node:path')
const fs = require('node:fs/promises')
const { Module, builtinModules } = require('node:module')
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
  inspectImports,
  codeSampleFromAstNode,
  inspectEsmImports,
} = require('lavamoat-tofu')
const { checkForResolutionOverride } = require('./resolutions')

/**
 * @callback ResolveHook
 * @param {string} requestedName
 * @param {string} referrer
 * @returns {string|null}
 */

// file extension omitted can be omitted, eg https://npmfs.com/package/yargs/17.0.1/yargs
const jsExtensions = new Set(
  /** @type {const} */ (['.cjs', '.mjs', '.js', '.json'])
)
const cjsResolutionOmittedExtensions = /** @type {const} */ (['.js', '.json'])

/**
 * Allow use of `node:` prefixed builtins.
 */
const BUILTIN_MODULES = Object.freeze(
  new Set(
    /** @type {const} */ ([
      ...builtinModules,
      ...builtinModules.map((id) => `node:${id}`),
    ])
  )
)

function isBuiltin(name) {
  return BUILTIN_MODULES.has(name)
}

module.exports = {
  parseForPolicy,
  makeResolveHook,
  makeImportHook,
  resolutionOmittedExtensions: cjsResolutionOmittedExtensions,
}

async function parseForPolicy({
  projectRoot: rootDir,
  entryId,
  policyOverride = {},
  shouldResolve,
  includeDebugInfo,
  ...args
}) {
  // XXX: if the pkg at rootDir contains subpath or conditional exports, the
  // entry ID _must_ be one of those exports.

  const { resolutions } = policyOverride
  const pkgJsonPath = path.join(rootDir, 'package.json')

  const canonicalNameMap = await loadCanonicalNameMap({
    rootDir,
    includeDevDeps: true,
  })

  const resolveHook = makeResolveHook(rootDir, canonicalNameMap, {
    resolutions,
  })

  const importHook = makeImportHook({
    shouldResolve,
    resolveHook,
    canonicalNameMap,
  })

  const moduleSpecifier = resolveHook(String(entryId).trim(), pkgJsonPath)
  console.debug('moduleSpecifier = %s', moduleSpecifier)
  const inspector = createModuleInspector({ isBuiltin, includeDebugInfo })
  // rich warning output
  inspector.on('compat-warning', displayRichCompatWarning)
  return coreParseForConfig({
    moduleSpecifier,
    importHook,
    isBuiltin,
    inspector,
    policyOverride,
    ...args,
  })
}

/**
 *
 * @param {string} rootDir
 * @param {Record<string, string>} canonicalNameMap
 * @param {Record<string, string>} [resolutions]
 * @returns {ResolveHook}
 */
function makeResolutionResolveHook(rootDir, canonicalNameMap, resolutions) {
  if (!resolutions || Object.keys(resolutions).length === 0) {
    // eslint-disable-next-line no-unused-vars
    return (requestedName, referrer) => null
  }
  return (requestedName, referrer) => {
    const parentPackageName = getPackageNameForModulePath(
      canonicalNameMap,
      referrer
    )
    // handle resolution overrides
    return (
      checkForResolutionOverride(
        resolutions,
        parentPackageName,
        requestedName
      ) ?? null
    )
  }
}

/**
 * Creates a resolve hook for a given project root, package.json, and canonical name map.
 * @param {string} rootDir - The root directory of the project.
 * @param {Record<string, string>} canonicalNameMap - A map of canonical names to module IDs.
 * @param {Object} opts - An optional object containing additional options.
 * @param {Record<string, string>} [opts.resolutions] - A map of package names to paths to override resolution.
 * @returns {ResolveHook} - A resolve hook function.
 */
function makeResolveHook(rootDir, canonicalNameMap, opts = {}) {
  const getResolutionOverride = makeResolutionResolveHook(
    rootDir,
    canonicalNameMap,
    opts.resolutions
  )

  return (requestedName, referrer) => {
    const resolutionOverride = getResolutionOverride(
      rootDir,
      requestedName,
      referrer
    )

    if (isBuiltin(requestedName)) {
      return requestedName
    }

    requestedName = requestedName || '.'

    if (resolutionOverride) {
      if (path.isAbsolute(resolutionOverride)) {
        requestedName = path.relative(rootDir, resolutionOverride)
      } else {
        requestedName = resolutionOverride
      }
    }

    const { resolve } = Module.createRequire(referrer)
    /* eslint-disable no-useless-catch */
    try {
      return resolve(requestedName)
    } catch (err) {
      console.warn(
        `lavamoat - unable to resolve "${requestedName}" from "${referrer}"`
      )
    }
    return null
  }
}

/**
 * Creates an import hook function passed into `lavamoat-core` for policy generation
 *
 * @param {Object} options - An object containing options for the import hook.
 * @param {ResolveHook} options.resolveHook - A function that resolves a module specifier to a filename.
 * @param {(requestedName?: string, specifier?: string) => boolean)} [options.shouldResolve] - A function that returns `true` if the given import should be resolved.
 * @param {import('@lavamoat/aa').CanonicalNameMap} options.canonicalNameMap - A map of package names to their canonical paths.
 * @param {LavamoatPolicy} [options.policyOverride] - A policy override object.
 * @returns {(specifier: string) => Promise<LavamoatModuleRecord>} An import hook function.
 */
function makeImportHook({
  resolveHook,
  shouldResolve = () => true,
  canonicalNameMap,
  policyOverride,
}) {
  return async (specifier) => {
    if (isBuiltin(specifier)) {
      return makeBuiltinModuleRecord(specifier)
    }

    // assume specifier is filename
    const filename = specifier
    const extension = path.extname(filename)
    const packageName = getPackageNameForModulePath(canonicalNameMap, filename)

    if (jsExtensions.has(extension)) {
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
   * @param {string} packageName - The name of the package the module belongs to.
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
   * Creates a CommonJS module record.
   *
   * @param {string} specifier - The module specifier.
   * @param {string} filename - The filename of the module.
   * @param {string} packageName - The name of the package.
   * @returns {Promise<LavamoatModuleRecord>} A promise that resolves to a LavamoatModuleRecord object.
   */
  async function makeJsModuleRecord(specifier, filename, packageName) {
    // load src
    const content = await fs.readFile(filename, 'utf8')
    // parse
    const ast = parseModule(content, specifier)
    // get imports
    const { esmImports } = inspectEsmImports(ast, null, false)
    const { cjsImports } = inspectImports(ast, null, false)

    // FIXME: if the package is CJS, and the extension is not `.mjs`, then the
    // file cannot contain `import` statements. this will require reading the
    // local `package.json` to determine, however.
    const imports = [...new Set([...esmImports, ...cjsImports])]

    // build import map
    const importMap = Object.fromEntries(
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
    // add policyOverride additions to import map (policy gen only)
    const policyOverrideImports = Object.keys(
      policyOverride?.resources?.[packageName]?.packages ?? {}
    )
    await Promise.all(
      policyOverrideImports.map(async (packageName) => {
        // skip if there is already an entry for the name
        if (packageName in importMap[packageName]) {
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
   * Detects common dynamically imported native modules and adds them to the import map
   * @param {string} filename - The name of the file.
   * @param {Record<string,string>} importMap - The import map object.
   */
  function handleNativeModules(filename, importMap) {
    // heuristics for detecting common dynamically imported native modules
    // important for generating a working config for apps with native modules
    if (importMap.bindings) {
      // detect native modules using "bindings" package
      try {
        const packageDir = bindings.getRoot(filename)
        const nativeModulePath = bindings({
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
      sourceType: 'module',
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
    const newErr = new Error(`Failed to parse file "${filename}": ${err.stack}`)
    newErr.file = filename
    newErr.prevErr = err
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
