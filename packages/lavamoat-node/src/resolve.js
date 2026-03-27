const path = require('node:path')
const { isBuiltin, createRequire } = require('node:module')
const resolve = require('resolve') // file extension omitted can be omitted, eg https://npmfs.com/package/yargs/17.0.1/yargs
// extensions we want the resolver to look for when given just the file name (it defaults to .js only)
const resolutionOmittedExtensions = ['.js', '.cjs', '.json']

// approximate polyfill for node's resolve
const createRequireFallback = (referrer) => {
  return {
    resolve: (requestedName) => {
      const basedir = path.dirname(referrer)
      const result = resolve.sync(requestedName, {
        basedir,
        extensions: resolutionOmittedExtensions,
      })
      // check for missing builtin modules (e.g. 'worker_threads' in node v10)
      // the "resolve" package resolves as "worker_threads" even if missing
      const resultMatchesRequest = requestedName === result
      if (resultMatchesRequest) {
        const isBuiltinModule = isBuiltin(result)
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

const pathIsWithin = (rootPath, targetPath) => {
  const relativePath = path.relative(rootPath, targetPath)
  return (
    relativePath === '' ||
    (!relativePath.startsWith('..') && !path.isAbsolute(relativePath))
  )
}

const NATIVE_IGNORES_SYMLINKS = !!process.env.NODE_PRESERVE_SYMLINKS
const NATIVE_WITH_FALLBACK_ENABLED = !!process.env.LAVAMOAT_RESOLVE_NATIVE

let trace
if (process.env.LAVAMOAT_DEBUG_RESOLVE) {
  const traces = []
  const num = Date.now()
  trace = (report) => {
    traces.push(report)
    require('node:fs').writeFileSync(
      `./trace-${num}.json`,
      JSON.stringify(traces, null, 2)
    )
  }
} else {
  trace = () => {}
}

exports.makeResolver = ({ projectRoot }) => {
  projectRoot = path.resolve(projectRoot) // ensure projectRoot is absolute
  const projectNodeModules = path.join(projectRoot, 'node_modules')
  return (requestedName, referrer) => {
    if (
      isBuiltin(requestedName) ||
      (path.isAbsolute(requestedName) &&
        pathIsWithin(projectRoot, requestedName))
    ) {
      return requestedName
    }
    let resolved
    let report = {
      via: 'unknown',
      requestedName,
      referrer,
    }

    if (NATIVE_IGNORES_SYMLINKS || NATIVE_WITH_FALLBACK_ENABLED) {
      const refUrl = new URL(`file://${referrer}`)
      resolved = createRequire(refUrl).resolve(requestedName)
      report.via = 'native'
      if (
        // resolved to a location outside the project's node_modules
        (path.isAbsolute(resolved) &&
          !pathIsWithin(projectNodeModules, resolved)) ||
        !resolutionOmittedExtensions.includes(path.extname(resolved))
      ) {
        report.via = 'fallback'
        report.resolvedWrong = resolved
        resolved = createRequireFallback(referrer).resolve(requestedName)
      }
    } else {
      report.via = 'old'
      resolved = createRequireFallback(referrer).resolve(requestedName)
    }
    report.resolved = resolved
    trace(report)
    return resolved
  }
}
