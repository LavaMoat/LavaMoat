const path = require('node:path')
const { promises: fs } = require('node:fs')
const { builtinModules } = require('node:module')
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
  codeSampleFromAstNode,
  LavamoatModuleRecord,
} = require('lavamoat-core')
const { parse, inspectImports } = require('lavamoat-tofu')
const { checkForResolutionOverride } = require('./resolutions')

// file extension omitted can be omitted, eg https://npmfs.com/package/yargs/17.0.1/yargs
const commonjsExtensions = ['', '.js', '.cjs']
const resolutionOmittedExtensions = ['.js', '.json']

/**
 * Allow use of `node:` prefixed builtins.
 */
const builtinPackages = [
  ...builtinModules,
  ...builtinModules.map((id) => `node:${id}`),
]

// approximate polyfill for node builtin
const createRequire = (url) => {
  return {
    resolve: (requestedName) => {
      const basedir = path.dirname(url.pathname)
      const result = resolve.sync(requestedName, {
        basedir,
        extensions: resolutionOmittedExtensions,
      })
      // check for missing builtin modules (e.g. 'worker_threads' in node v10)
      // the "resolve" package resolves as "worker_threads" even if missing
      const resultMatchesRequest = requestedName === result
      if (resultMatchesRequest) {
        const isBuiltinModule = builtinPackages.includes(result)
        const looksLikeAPath = requestedName.includes('/')
        if (!looksLikeAPath && !isBuiltinModule) {
          const errMsg = `Cannot find module '${requestedName}' from '${basedir}'`
          const err = new Error(errMsg)
          err.code = 'MODULE_NOT_FOUND'
          throw err
        }
      }
      // return resolved path
      return result
    },
  }
}

module.exports = {
  parseForPolicy,
  makeResolveHook,
  makeImportHook,
  resolutionOmittedExtensions,
}

/**
 * @typedef ParseForPolicyOpts
 * @property {string} projectRoot
 * @property {string} entryId
 * @property {import('lavamoat-core').LavaMoatPolicy} policyOverride
 * @property {string} rootPackageName
 * @property {(requestedName: string, specifier: string) => boolean} shouldResolve
 * @property {includeDebugInfo} boolean
 */

/**
 * @param {ParseForPolicyOpts} opts
 * @returns {Promise<import('lavamoat-core').LavaMoatPolicy>}
 */
async function parseForPolicy({
  projectRoot,
  entryId,
  policyOverride = {},
  rootPackageName,
  shouldResolve,
  includeDebugInfo,
  ...args
}) {
  const isBuiltin = (id) => builtinPackages.includes(id)
  const { resolutions } = policyOverride
  const canonicalNameMap = await loadCanonicalNameMap({
    rootDir: projectRoot,
    includeDevDeps: true,
  })
  const resolveHook = makeResolveHook({
    projectRoot,
    resolutions,
    rootPackageName,
    canonicalNameMap,
  })
  const importHook = makeImportHook({
    rootPackageName,
    shouldResolve,
    isBuiltin,
    resolveHook,
    canonicalNameMap,
    policyOverride,
  })
  const moduleSpecifier = resolveHook(
    entryId,
    path.join(projectRoot, 'package.json')
  )
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
    // utilize node's internal resolution algo
    const { resolve } = createRequire(new URL(`file://${referrer}`))
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

function makeImportHook({
  isBuiltin,
  resolveHook,
  shouldResolve = () => true,
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

    if (extension === '.node') {
      return makeNativeModuleRecord(specifier, filename, packageName)
    }
    try {
      var content = await fs.readFile(filename, 'utf8')
    } catch (err) {
      console.warn(
        `lavamoat-node/makeImportHook - could not read file "${filename}"`
      )
      return undefined
    }
    if (commonjsExtensions.includes(extension)) {
      return makeJsModuleRecord(specifier, content, filename, packageName)
    }
    if (extension === '.json') {
      return makeJsonModuleRecord(specifier, content, filename, packageName)
    }
    throw new Error(
      `lavamoat-node/makeImportHook - unknown module file extension "${extension}" in filename "${filename}"`
    )
  }

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

  async function makeJsModuleRecord(specifier, content, filename, packageName) {
    // parse
    const ast = parseModule(content, specifier)
    // get imports
    const { cjsImports } = inspectImports(ast, null, false)
    // build import map
    const importMap = Object.fromEntries(
      cjsImports.map((requestedName) => {
        let depValue
        if (shouldResolve(requestedName, specifier)) {
          try {
            depValue = resolveHook(requestedName, specifier)
          } catch (err) {
            // graceful failure
            console.warn(
              `lavamoat-node/makeImportHandler - could not resolve "${requestedName}" from "${specifier}"`
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
        if (packageName in importMap) {
          return
        }
        // do not pursue root as a dependency to scan
        if (packageName === '$root$') {
          return
        }
        // resolve and add package main in override
        const packageRoot = getMapKeyForValue(canonicalNameMap, packageName)
        if (!packageRoot) {
          console.warn(
            `lavamoat could not find package's entry script for ${packageName} as found in policy-override`
          )
          return
        }
        const packageJson = JSON.parse(
          await fs.readFile(path.join(packageRoot, 'package.json'), 'utf8')
        )
        const main = packageJson.main ?? 'index.js'
        const mainPath = path.resolve(packageRoot, main)
        importMap[packageName] = mainPath
      })
    )

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

  async function makeJsonModuleRecord(
    specifier,
    rawContent,
    filename,
    packageName
  ) {
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
