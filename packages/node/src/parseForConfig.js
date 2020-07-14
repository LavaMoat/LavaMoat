const path = require('path')
const { promises: fs } = require('fs')
const { createRequire, builtinModules: builtinPackages } = require('module')
const { packageNameFromPath, packageDataForModule, parseForConfig: coreParseForConfig, LavamoatModuleRecord } = require('lavamoat-core')
const { parse, inspectImports } = require('lavamoat-tofu')
const { checkForResolutionOverride } = require('./resolutions')

module.exports = { parseForConfig, makeResolveHook, makeImportHook }


async function parseForConfig ({ cwd, entryId, resolutions, rootPackageName, shouldResolve, shouldImport }) {
  const isBuiltin = (id) => builtinPackages.includes(id)
  const resolveHook = makeResolveHook({ cwd, resolutions, rootPackageName })
  const importHook = makeImportHook({ rootPackageName, isBuiltin })
  const moduleSpecifier = resolveHook(entryId, `${cwd}/package.json`)
  return coreParseForConfig({ moduleSpecifier, resolveHook, importHook, isBuiltin, shouldResolve, shouldImport })
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

function makeImportHook ({ isBuiltin, rootPackageName = '<root>' }) {
  return async (specifier) => {
    let type, packageName, packageVersion, content, imports = [], ast
    // get package name
    if (isBuiltin(specifier)) {
      type = 'builtin'
      packageName = specifier
    } else {
      type = 'js'
      const packageData = packageDataForModule({ id: specifier, file: specifier }, rootPackageName)
      packageName = packageData.packageName
      packageVersion = packageData.packageVersion
      // load src
      content = await fs.readFile(specifier, 'utf8')
      // parse
      const extension = path.extname(specifier)
      if (extension === '.js') {
        ast = parseModule(content, specifier)
        // get imports
        const { cjsImports } = inspectImports(ast, null, false)
        imports = Array.from(new Set(cjsImports))
      } else {
        if (!['.css','.sass','.coffee','.json','.node'].includes(extension)) {
          console.warn(`node importHook - ignored unknown extension "${extension}"`)
        }
      }
    }
    return new LavamoatModuleRecord({ specifier, packageName, packageVersion, content, type, imports, ast })
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
