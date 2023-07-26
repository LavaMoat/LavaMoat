const path = require('path')
const { parseForPolicy: nodeParseForConfig, makeResolveHook, makeImportHook } = require('lavamoat/src/parseForPolicy')
const { builtinModules: builtinPackages } = require('module')
const { inspectSesCompat, codeSampleFromAstNode } = require('lavamoat-tofu')
const { walk } = require('lavamoat-core/src/walk')

module.exports = { parseForPolicy }

// async function parseForPolicy ({ packageDir, entryId, rootPackageName }) {
//   const resolveHook = makeResolveHook({ cwd: packageDir, rootPackageName })
//   // for the survey, we want to skip resolving dependencies (other packages)
//   // we also want to gracefully handle resolution failures
//   const shouldResolve = (requestedName, parentSpecifier) => {
//     const looksLikePackage = !(requestedName.startsWith('.') || requestedName.startsWith('/'))
//     if (looksLikePackage) return false
//     // ignore modules that cant be resolved
//     try {
//       resolveHook(requestedName, parentSpecifier)
//       return true
//     } catch (err) {
//       if (err.code === 'MODULE_NOT_FOUND') return false
//       throw err
//     }
//   }
//   return nodeParseForConfig({ cwd: packageDir, entryId, rootPackageName, shouldResolve })
// }

async function parseForPolicy ({ packageDir, entryId, rootPackageName }) {
  const isBuiltin = (id) => builtinPackages.includes(id)
  const resolveHook = makeResolveHook({ cwd: packageDir, rootPackageName })
  // for the survey, we want to skip resolving dependencies (other packages)
  // we also want to gracefully handle resolution failures
  const shouldResolve = (requestedName, parentSpecifier) => {
    const looksLikePackage = !(requestedName.startsWith('.') || requestedName.startsWith('/'))
    if (looksLikePackage) {
      return false
    }
    // attempt to resolve
    let resolved
    try {
      resolved = resolveHook(requestedName, parentSpecifier)
    } catch (err) {
      // ignore modules that cant be resolved
      if (err.code === 'MODULE_NOT_FOUND') {
        return false
      }
      throw err
    }
    const extension = path.extname(resolved).slice(1)
    // allow allow whitelisted extensions
    return ['js','json','cjs','node'].includes(extension)
  }

  const environment = {}

  if (shouldResolve(entryId, `${packageDir}/package.json`)) {
    const importHook = makeImportHook({ rootPackageName, resolveHook, shouldResolve, isBuiltin })
    const moduleSpecifier = resolveHook(entryId, `${packageDir}/package.json`)
    await walk({ moduleSpecifier, resolveHook, importHook, visitorFn })
  } else {
    environment.skipped = `package main cant be resolved: "${entryId}"`
  }

  // dont include empty config
  if (Object.keys(environment).length === 0) {
    return { resources: {} }
  }

  return {
    resources: {
      [rootPackageName]: {
        environment,
      },
    },
  }

  function visitorFn (moduleRecord) {
    if (!moduleRecord.ast) {
      return
    }
    const { primordialMutations, strictModeViolations, dynamicRequires } = inspectSesCompat(moduleRecord.ast)
    const serializableResults = {}
    if (primordialMutations.length) {
      serializableResults.primordialMutations = primordialMutations.map(({ node }) => {
        return codeSampleFromAstNode(node, moduleRecord)
      })
    }
    if (dynamicRequires.length) {
      serializableResults.dynamicRequires = dynamicRequires.map(({ node }) => {
        return codeSampleFromAstNode(node, moduleRecord)
      })
    }
    if (strictModeViolations.length) {
      serializableResults.strictModeViolations = strictModeViolations.map(({ loc, error }) => {
        // create a fake ast node for the error (just range for code pos)
        const { line, column } = loc
        const fakeNode = { loc: { start: { line, column }, end: { line, column } } }
        // get code sample and link
        const data = codeSampleFromAstNode(fakeNode, moduleRecord)
        // append error message
        data.error = error.message
        return data
      })
    }

    // if there are results, append them
    if (Reflect.ownKeys(serializableResults).length) {
      environment[moduleRecord.specifier] = serializableResults
    }
  }

}
