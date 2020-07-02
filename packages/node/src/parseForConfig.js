const path = require('path')
const { promises: fs } = require('fs')
const { createRequire, builtinModules: builtinPackages } = require('module')
const { packageNameFromPath, parseForConfig: coreParseForConfig, LavamoatModuleRecord } = require('lavamoat-core')
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
  return (specifier, referrer) => {
    const parentPackageName = packageNameFromPath(referrer) || rootPackageName
    // handle resolution overrides
    const result = checkForResolutionOverride(resolutions, parentPackageName, specifier)
    if (result) {
      // if path is a relative path, it should be relative to the cwd
      if (path.isAbsolute(result)) {
        specifier = result
      } else {
        specifier = path.resolve(cwd, result)
      }
    }
    // utilize node's internal resolution algo
    const { resolve } = createRequire(new URL(`file://${referrer}`))
    let resolved
    try {
      resolved = resolve(specifier)
    } catch (err) {
      // re-through error so its not in ndb's blackboxed scripts
      throw err
    }
    return resolved
  }
}

function makeImportHook ({ isBuiltin, rootPackageName = '<root>' }) {
  return async (specifier) => {
    let type, packageName, content, imports = [], ast
    // get package name
    if (isBuiltin(specifier)) {
      type = 'builtin'
      packageName = specifier
    } else {
      type = 'js'
      packageName = packageNameFromPath(specifier) || rootPackageName
      // load src
      content = await fs.readFile(specifier, 'utf8')
      // parse
      const extension = path.extname(specifier)
      if (extension === '.js') {
        ast = parseModule(content)
        // get imports
        const { cjsImports } = inspectImports(ast, null, false)
        imports = Array.from(new Set(cjsImports))
      } else {
        if (!['.json'].includes(extension)) {
          console.warn(`node importHook - ignored unknown extension "${extension}"`)
        }
      }
    }
    return new LavamoatModuleRecord({ specifier, packageName, content, type, imports, ast })
  }
}

function parseModule (moduleSrc) {
  // transformFromAstAsync
  const ast = parse(moduleSrc, {
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
  return ast
}
