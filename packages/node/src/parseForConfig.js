const path = require('path')
const { builtinModules: builtinPackages } = require('module')
const mdeps = require('module-deps')
const resolve = require('resolve')
const { createConfigSpy, createPackageDataStream } = require('lavamoat-core')
const { checkForResolutionOverride } = require('./resolutions')

module.exports = { parseForConfig }

async function parseForConfig ({ cwd, entryId, resolutions }) {
  const md = mdeps({
    // module resolution
    resolve: (requestedName, parent, cb) => {
      // handle resolution overrides
      const parentPackageName = (parent.package && parent.package.name) || '<root>'
      const result = checkForResolutionOverride(resolutions, parentPackageName, requestedName)
      if (result) {
        // if path is a relative path, it should be relative to the cwd
        if (path.isAbsolute(result)) {
          requestedName = result
        } else {
          requestedName = path.resolve(cwd, result)
        }
      }
      // resolve via node-resolve
      resolve(requestedName, parent, cb)
    },

    persistentCache: (file, id, pkg, fallback, cb) => {
      // intercept core packages and return dummy result
      if (resolve.isCore(id)) {
        const result = {
          package: pkg,
          source: '',
          deps: {}
        }
        cb(null, result)
        return
      }
      // otherwise fallback
      fallback(null, cb)
    },
    filter: (id) => {
      // skip json so we dont encounter a parse failure
      if (id.indexOf('.json') > 0) return false
      // otherwise ok
      return true
    },
    // during parse, ignore missing modules
    // let this be handled during runtime
    ignoreMissing: true
  })
  md.end({ file: entryId })

  let resolvePromise
  const parsePromise = new Promise(resolve => { resolvePromise = resolve })

  md
  // annotate with package name
    .pipe(createPackageDataStream())
  // inspect
    .pipe(createConfigSpy({
      builtinPackages,
      onResult: resolvePromise
    }))
    .resume()

  // get initial config from configSpy
  const initialSerializedConfig = await parsePromise
  const config = JSON.parse(initialSerializedConfig)

  return config
}
