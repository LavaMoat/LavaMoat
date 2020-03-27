const mdeps = require('module-deps')
const resolve = require('resolve')
const { createConfigSpy, createPackageDataStream } = require('lavamoat-core')

module.exports = { parseForConfig }

async function parseForConfig ({ entryId }) {
  const md = mdeps({
    // resolve via node-resolve,
    resolve,
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
      onResult: resolvePromise
    }))
    .resume()

  const serializedConfig = await parsePromise
  return serializedConfig
}
