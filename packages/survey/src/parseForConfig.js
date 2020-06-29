const path = require('path')
const { createRequire, builtinModules: builtinPackages } = require('module')
const mdeps = require('module-deps')
const resolve = require('resolve')
const { createConfigSpy } = require('lavamoat-core')
const { parse, inspectImports } = require('lavamoat-tofu')
const through = require('through2').obj


module.exports = { parseForConfig }

async function parseForConfig ({ cwd, entryId, packageName }) {
  // mdeps doesnt run "filter" on the entry
  if (!shouldParse(entryId)) return { resources: {} }

  const md = mdeps({
    // module resolution
    resolve: (requestedName, parent, cb) => {
      const isAbsolute = path.isAbsolute(requestedName)
      const inThisPackage = isAbsolute || requestedName.startsWith('.')
      if (!inThisPackage) {
        return cb(new Error(`Ignoring module from different package "${requestedName}"`))
      }
      // resolve via node-resolve
      // resolve(requestedName, parent, cb)
      const { resolve } = createRequire(new URL(`file://${parent.filename}`))
      let resolved
      try {
        resolved = resolve(requestedName)
      } catch (err) {
        return cb(err)
      }
      cb(null, resolved)
    },
    // override module-deps internal parsing to support more modern js features
    detect: (moduleSrc) => {
      const ast = parse(moduleSrc, {
        // esm support
        sourceType: 'module',
        // someone must have been doing this
        allowReturnOutsideFunction: true,
      })
      const { cjsImports } = inspectImports(ast, null, false)
      const moduleIds = Array.from(new Set(cjsImports))
      return moduleIds
    },
    postFilter: shouldParse,
    // during parse, ignore missing modules
    ignoreMissing: true
  })
  md.end({ file: path.resolve(cwd, entryId) })

  let resolvePromise
  const parsePromise = new Promise(resolve => { resolvePromise = resolve })

  md
  // annotate with package name
    .pipe(through((moduleData, _, cb) => {
      moduleData.package = packageName
      moduleData.packageName = packageName
      cb(null, moduleData)
    }))
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


  function shouldParse (moduleId, file, pkg) {
    // non-relative files are fine
    if (!moduleId.startsWith('.')) return true
    const resolved = file || moduleId
    const extension = path.extname(resolved)
    // only supported extensions
    if (!['.js', '.cjs', '.mjs'].includes(extension)) {
      // log unfamiliar skips
      if (!['.json','.css', '.sass', '.coffee', '.node'].includes(extension)) {
        console.log('skip parse', packageName, resolved, extension)
      }
      return false
    }
    // otherwise ok
    return true
  }
}
