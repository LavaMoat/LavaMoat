const { createConfigSpy } = require('lavamoat-browserify/src/generateConfig')
const { createPackageDataStream } = require('lavamoat-browserify/src/packageData')
const mdeps = require('module-deps')
const resolve = require('resolve')

module.exports = { parseForConfig }

async function parseForConfig ({ entryId }) {
  const md = mdeps({
    resolve,
    // filter: (id) => !resolve.isCore(id),
    filter: (id) => {
      // skip builtin modules
      if (resolve.isCore(id)) return false
      // skip json
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
