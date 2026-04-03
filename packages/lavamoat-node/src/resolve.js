// @ts-check
const path = require('node:path')
const { isBuiltin, createRequire } = require('node:module')
const resolve = require('resolve') // file extension omitted can be omitted, eg https://npmfs.com/package/yargs/17.0.1/yargs
// extensions we want the resolver to look for when given just the file name (it defaults to .js only)
const resolutionOmittedExtensions = ['.js', '.cjs', '.json']

// approximate polyfill for node's resolve
/**
 * @param {string} referrer
 * @returns {{ resolve: (requestedName: string) => string }} }
 */
const createRequireFallback = (referrer) => {
  return {
    /**
     * @param {string} requestedName
     * @returns {string}
     */
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
          /** @type {Error & { code?: string }} */
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

/**
 * @param {string} rootPath
 * @param {string} targetPath
 * @returns {boolean}
 */
const pathIsWithin = (rootPath, targetPath) => {
  const relativePath = path.relative(rootPath, targetPath)
  return (
    relativePath === '' ||
    (!relativePath.startsWith('..') && !path.isAbsolute(relativePath))
  )
}

const NATIVE_IGNORES_SYMLINKS = !!process.env.NODE_PRESERVE_SYMLINKS
const NATIVE_WITH_FALLBACK_ENABLED = !!process.env.LAVAMOAT_RESOLVE_NATIVE

/**
 * @typedef {object} ResolutionReport
 * @property {string} via
 * @property {string} requestedName
 * @property {string} referrer
 * @property {string} [fallbackError]
 * @property {string} [resolved]
 * @property {string} [resolvedWrong]
 */

/**
 * @type {(report: ResolutionReport) => void}
 */
let trace
if (process.env.LAVAMOAT_DEBUG_RESOLVE) {
  /** @type {ResolutionReport[]} */
  const traces = []
  const num = Date.now()
  /**
   * @param {ResolutionReport} report
   */
  trace = (report) => {
    traces.push(report)
    require('node:fs').writeFileSync(
      `trace-${num}.json`,
      JSON.stringify(traces, null, 2)
    )
  }
} else {
  trace = () => {}
}

/**
 * @param {object} params
 * @param {ResolutionReport} params.report - Report object to track resolution
 *   details
 * @param {string} params.requestedName - The module name being requested
 * @param {string} params.referrer - The file path requesting the module
 * @returns {string} The resolved module path
 */
function resolveViaFallback({ report, requestedName, referrer }) {
  let resolved
  report.via = 'fallback'
  try {
    resolved = createRequireFallback(referrer).resolve(requestedName)
  } catch (err) {
    report.fallbackError = err instanceof Error ? err.message : String(err)
    report.resolved = resolved
    trace(report)
    throw err
  }
  return resolved
}

/**
 * @param {object} params
 * @param {string} params.projectRoot
 * @returns {(requestedName: string, referrer: string) => string}
 */
exports.makeResolver = ({ projectRoot }) => {
  projectRoot = path.resolve(projectRoot) // ensure projectRoot is absolute
  const projectNodeModules = path.join(projectRoot, 'node_modules')
  /**
   * @param {string} requestedName
   * @param {string} referrer
   * @returns {string}
   */
  return (requestedName, referrer) => {
    if (
      isBuiltin(requestedName) ||
      (path.isAbsolute(requestedName) &&
        pathIsWithin(projectRoot, requestedName))
    ) {
      return requestedName
    }
    /** @type {string} */
    let resolved
    /** @type {ResolutionReport} */
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
        report.resolvedWrong = resolved
        resolved = resolveViaFallback({ report, requestedName, referrer })
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
