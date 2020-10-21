const path = require('path')
const { promises: fs } = require('fs')
const { builtinModules: builtinPackages } = require('module')
const resolve = require('resolve')
const bindings = require('bindings')
const gypBuild = require('node-gyp-build')
const fromEntries = require('object.fromentries')
const { codeFrameColumns } = require('@babel/code-frame')
const {
  packageNameFromPath,
  packageDataForModule,
  parseForConfig: coreParseForConfig,
  createModuleInspector,
  LavamoatModuleRecord
} = require('lavamoat-core')
const { parse, inspectImports, codeSampleFromAstNode } = require('lavamoat-tofu')
const { checkForResolutionOverride } = require('./resolutions')

const commonjsExtensions = ['.js', '.cjs']
const resolutionOmittedExtensions = ['.js', '.json']

// approximate polyfill for node builtin
const createRequire = (url) => {
  return {
    resolve: (requestedName) => {
      const basedir = path.dirname(url.pathname)
      const result = resolve.sync(requestedName, {
        basedir,
        extensions: resolutionOmittedExtensions
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
    }
  }
}

module.exports = { parseForConfig, makeResolveHook, makeImportHook, resolutionOmittedExtensions }

async function parseForConfig ({ cwd, entryId, resolutions, rootPackageName, shouldResolve, includeDebugInfo, ...args }) {
  const isBuiltin = (id) => builtinPackages.includes(id)
  const resolveHook = makeResolveHook({ cwd, resolutions, rootPackageName })
  const importHook = makeImportHook({ rootPackageName, shouldResolve, isBuiltin, resolveHook })
  const moduleSpecifier = resolveHook(entryId, `${cwd}/package.json`)
  const inspector = createModuleInspector({ isBuiltin, includeDebugInfo })
  // rich warning output
  inspector.on('compat-warning', displayRichCompatWarning)
  return coreParseForConfig({ moduleSpecifier, importHook, isBuiltin, inspector, ...args })
}

function makeResolveHook ({ cwd, resolutions = {}, rootPackageName = '<root>' }) {
  return (requestedName, referrer) => {
    const parentPackageName = packageNameFromPath(referrer) || rootPackageName
    // handle resolution overrides
    const result = checkForResolutionOverride(resolutions, parentPackageName, requestedName)
    if (result) {
      // if path is a relative path, it should be relative to displayRichCompatWarningthe cwd
      if (path.isAbsolute(result)) {
        requestedName = result
      } else {
        requestedName = path.resolve(cwd, result)
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
        console.warn(`lavamoat - unable to resolve "${requestedName}" from "${referrer}"`)
      }
      // return "null" to mean failed to resolve
      return null
    }
    return resolved
  }
}

function makeImportHook ({
  isBuiltin,
  resolveHook,
  shouldResolve = () => true,
  rootPackageName = '<root>'
}) {
  return async (specifier) => {
    // see if its a builtin
    if (isBuiltin(specifier)) {
      return makeBuiltinModuleRecord(specifier)
    }

    // assume specifier is filename
    const filename = specifier
    const extension = path.extname(filename)
    const packageData = packageDataForModule({ id: specifier, file: filename }, rootPackageName)

    if (commonjsExtensions.includes(extension)) {
      return makeJsModuleRecord(specifier, filename, packageData)
    }
    if (extension === '.node') {
      return makeNativeModuleRecord(specifier, filename, packageData)
    }
    if (extension === '.json') {
      return makeJsonModuleRecord(specifier, filename, packageData)
    }
    throw new Error(`lavamoat-node/makeImportHook - unknown module file extension "${extension}" in filename "${filename}"`)
  }

  function makeBuiltinModuleRecord (specifier) {
    return new LavamoatModuleRecord({
      type: 'builtin',
      specifier,
      file: `builtin/${specifier}`,
      packageName: specifier,
      packageVersion: specifier,
      // special module initializer that directly accesses node's require
      moduleInitializer: (moduleExportsWrapper) => {
        moduleExportsWrapper.exports = require(specifier)
      }
    })
  }

  function makeNativeModuleRecord (specifier, filename, packageData) {
    const { packageName, packageVersion } = packageData
    return new LavamoatModuleRecord({
      type: 'native',
      specifier,
      file: filename,
      packageName,
      packageVersion,
      // special module initializer that directly accesses node's require
      moduleInitializer: (moduleExportsWrapper) => {
        moduleExportsWrapper.exports = require(specifier)
      }
    })
  }

  async function makeJsModuleRecord (specifier, filename, packageData) {
    const { packageName, packageVersion } = packageData
    // load src
    const content = await fs.readFile(filename, 'utf8')
    // parse
    const ast = parseModule(content, specifier)
    // get imports
    const { cjsImports } = inspectImports(ast, null, false)
    // build import map
    const importMap = fromEntries(cjsImports.map(requestedName => {
      let depValue
      if (shouldResolve(requestedName, specifier)) {
        try {
          depValue = resolveHook(requestedName, specifier)
        } catch (err) {
          // graceful failure
          console.warn(`lavamoat-node/makeImportHandler - could not resolve "${requestedName}" from "${specifier}"`)
          depValue = null
        }
      } else {
        // resolving is skipped so put in a dummy value
        depValue = null
      }
      return [requestedName, depValue]
    }))

    // heuristics for detecting common dynamically imported native modules
    // important for generating a working config for apps with native modules
    if (importMap.bindings) {
      // detect native modules using "bindings" package
      try {
        const packageDir = bindings.getRoot(filename)
        const nativeModulePath = bindings({ path: true, module_root: packageDir })
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
      packageVersion,
      content,
      importMap,
      ast
    })
  }

  async function makeJsonModuleRecord (specifier, filename, packageData) {
    const { packageName, packageVersion } = packageData
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
      packageVersion,
      content: cjsContent
    })
  }
}

function parseModule (moduleSrc, filename = '<unknown file>') {
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
      errorRecovery: true
    })
  } catch (err) {
    const newErr = new Error(`Failed to parse file "${filename}": ${err.stack}`)
    newErr.file = filename
    newErr.prevErr = err
    throw newErr
  }
  return ast
}

function displayRichCompatWarning ({ moduleRecord, compatWarnings }) {
  const { packageName, file } = moduleRecord
  const { primordialMutations, strictModeViolations, dynamicRequires } = compatWarnings
  console.warn(`⚠️  Potentially incomptabile code detected in package "${packageName}" file "${file}":`)
  logWarnings('primordial mutation', primordialMutations)
  logWarnings('dynamic require', dynamicRequires)
  logErrors('strict mode violation', strictModeViolations)

  function logWarnings (message, sites) {
    sites.forEach(({ node }) => {
      const { npmfs } = codeSampleFromAstNode(node, moduleRecord)
      if (npmfs) console.warn(`  link: ${npmfs}`)
      const output = codeFrameColumns(moduleRecord.content, node.loc, { message, highlightCode: true })
      console.warn(output)
    })
  }

  function logErrors (category, sites) {
    sites.forEach(({ loc, error }) => {
      const range = { start: loc }
      const { npmfs } = codeSampleFromAstNode({ loc: range }, moduleRecord)
      if (npmfs) console.warn(`  link: ${npmfs}`)
      const message = `${category}: ${error.message}`
      const output = codeFrameColumns(moduleRecord.content, range, { message, highlightCode: true })
      console.warn(output)
    })
  }
}
