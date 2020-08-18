const path = require('path')
const { promises: fs } = require('fs')
const { createRequire, builtinModules: builtinPackages } = require('module')
const { packageNameFromPath, packageDataForModule, parseForConfig: coreParseForConfig, LavamoatModuleRecord } = require('lavamoat-core')
const { parse, inspectImports } = require('lavamoat-tofu')
const { checkForResolutionOverride } = require('./resolutions')

module.exports = { parseForConfig, makeResolveHook, makeImportHook }

async function parseForConfig ({ cwd, entryId, resolutions, rootPackageName, shouldResolve, ...args }) {
  const isBuiltin = (id) => builtinPackages.includes(id)
  const resolveHook = makeResolveHook({ cwd, resolutions, rootPackageName })
  const importHook = makeImportHook({ rootPackageName, shouldResolve, isBuiltin, resolveHook })
  const moduleSpecifier = resolveHook(entryId, `${cwd}/package.json`)
  return coreParseForConfig({ moduleSpecifier, importHook, isBuiltin, ...args })
}

function makeResolveHook ({ cwd, resolutions = {}, rootPackageName = '<root>' }) {
  return (requestedName, referrer) => {
    const parentPackageName = packageNameFromPath(referrer) || rootPackageName
    // handle resolution overrides
    const result = checkForResolutionOverride(resolutions, parentPackageName, requestedName)
    if (result) {
      // if path is a relative path, it should be relative to the cwd
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
      // re-through error so its not in ndb's blackboxed scripts
      throw err
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

    if (extension === '.node') {
      return makeNativeModuleRecord(specifier, filename, packageData)
    }
    if (extension === '.js') {
      return makeJsModuleRecord(specifier, filename, packageData)
    }
    // warn if not known to be skippable
    if (!['.css', '.sass'].includes(extension)) {
      console.warn(`node importHook - ignored unknown extension "${extension}"`)
    }
    // TODO: throw an error here, if ignore flag is not set
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
    const importMap = Object.fromEntries(cjsImports.map(requestedName => {
      let depValue
      if (shouldResolve(requestedName, specifier)) {
        // try {
        depValue = resolveHook(requestedName, specifier)
        // } catch (err) {
        //   // graceful failure
        //   console.warn(`lavamoat-node/makeImportHandler - could not resolve "${requestedName}" from "${specifier}"`)
        //   depValue = requestedName
        // }
      } else {
        // resolving is skipped so put in a dummy value
        depValue = requestedName
      }
      return [requestedName, depValue]
    }))
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
