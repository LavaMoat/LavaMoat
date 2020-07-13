const { parseForConfig: nodeParseForConfig, makeResolveHook, makeImportHook } = require('lavamoat/src/parseForConfig')
const { builtinModules: builtinPackages } = require('module')
const { inspectSesCompat } = require('lavamoat-tofu')
const { walk } = require('lavamoat-core/src/walk')

module.exports = { parseForConfig }

// async function parseForConfig ({ packageDir, entryId, rootPackageName }) {
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

async function parseForConfig ({ packageDir, entryId, rootPackageName }) {
  const isBuiltin = (id) => builtinPackages.includes(id)
  const resolveHook = makeResolveHook({ cwd: packageDir, rootPackageName })
  const importHook = makeImportHook({ rootPackageName, isBuiltin })
  const moduleSpecifier = resolveHook(entryId, `${packageDir}/package.json`)
  // for the survey, we want to skip resolving dependencies (other packages)
  // we also want to gracefully handle resolution failures
  const shouldResolve = (requestedName, parentSpecifier) => {
    const looksLikePackage = !(requestedName.startsWith('.') || requestedName.startsWith('/'))
    if (looksLikePackage) return false
    // ignore modules that cant be resolved
    try {
      resolveHook(requestedName, parentSpecifier)
      return true
    } catch (err) {
      if (err.code === 'MODULE_NOT_FOUND') return false
      throw err
    }
  }

  const environment = {}
  
  await walk({ moduleSpecifier, resolveHook, importHook, visitorFn, shouldResolve })

  // dont include empty config
  if (Object.keys(environment).length === 0) return { resources: {} }
  
  return {
    resources: {
      [rootPackageName]: {
        environment
      }
    }
  }
  
  function visitorFn (moduleRecord) {
    if (!moduleRecord.ast) return
    const results = inspectSesCompat(moduleRecord.ast)
    if (results.intrinsicMutations.length === 0) return
    const hits = results.intrinsicMutations.map(({ node }) => {
      const { content } = moduleRecord
      const { start, end } = node.loc
      const lines = content.split('\n')
      const startLine = lines[start.line - 1]
      const sample = startLine.slice(start.column, start.column + 80)
      return {
        start,
        end,
        sample,
      }
    })
    environment[moduleRecord.specifier] = hits
    // inspect each module
    // const moduleData = moduleRecordToModuleData({ moduleRecord, shouldResolve, resolveHook })
    // inspector.inspectModule(moduleData)

  }
  
}
