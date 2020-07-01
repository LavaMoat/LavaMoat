const path = require('path')
const { callbackify } = require('util')
const mdeps = require('module-deps')
const resolve = require('resolve')
const { parse, inspectImports } = require('lavamoat-tofu')
const through = require('through2').obj
const { createConfigSpy } = require('./generateConfig')
const { createPackageDataStream } = require('./packageData')

module.exports = { parseForConfig }

// ModuleStaticRecord = { imports: ["abc","xyz"] }

// const resolveHook = (spec, referrer) => new URL(spec, referrer).toString();
// const importHook = async (moduleSpecifier) => {
//   const moduleLocation = locate(moduleSpecifier);
//   const string = await retrieve(moduleLocation);
//   return new ModuleStaticRecord(string, moduleLocation);
// };

// getRelativeModuleId = (parentAbsolutePath, requestedName) => absolutePathString
// loadModuleData = (absolutePath) => new LavamoatModuleRecord({ type, file, package, moduleInitializer })

async function parseForConfig ({
  cwd,
  entryId,
  rootPackageName = '<root>',
  resolveHook,
  isBuiltin,
  ignoreDependencies = false,
}) {
  // mdeps doesnt run "filter" on the entry
  // node's resolveHook seemed to not allow a directory, thus the "__fake.js"
  if (cwd === undefined) throw new Error(`parseForConfig - must specify "cwd"`)
  const resolvedEntry = resolveHook(entryId, `${cwd}/__fake.js`)
  // console.log({ resolvedEntry })
  if (!shouldParse(resolvedEntry)) return { resources: {} }
  const fullEntryPath = path.resolve(cwd, entryId)

  const md = mdeps({
    // module resolution
    resolve: callbackify(async (requestedName, parent) => {
      const isEntryModule = requestedName === fullEntryPath
      // console.log('resolve core start', requestedName, parent, isEntryModule)
      if (ignoreDependencies) {
        // optionally ignore modules from other packages
        const inThisPackage = isEntryModule || requestedName.startsWith('.')
        if (!inThisPackage) {
          console.warn(`skip "${requestedName}" under "${entryId}"`)
          // throwing errors syncly is annoying in ndb
          await new Promise(resolve => setTimeout(resolve))
          throw new Error(`Ignoring module from different package "${requestedName}" under "${entryId}"`)
        }
      }
      // // workaround for entry path missing receiver
      // if (isEntryModule) {
      //   return fullEntryPath
      // }
      // perform resolution based on resolveHook
      const resolved = resolveHook(requestedName, parent.filename)
      return resolved
    }),
    persistentCache: (file, id, pkg, fallback, cb) => {
      if (isBuiltin(id)) {
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
    // override module-deps internal parsing to support more modern js features
    detect: (moduleSrc) => {
      // transformFromAstAsync
      const ast = parse(moduleSrc, {
        // esm support
        sourceType: 'module',
        // someone must have been doing thiscreatePackageDataStream
        allowReturnOutsideFunction: true,
        // plugins: [
        //   '@babel/plugin-transform-literals',
        //   // '@babel/plugin-transform-reserved-words',
        //   // '@babel/plugin-proposal-class-properties',
        // ]
        errorRecovery: true,
      })
      const { cjsImports } = inspectImports(ast, null, false)
      const moduleIds = Array.from(new Set(cjsImports))
      return moduleIds
    },
    // for some damn reason if resolve throws an error, this is still called after
    postFilter: (moduleId, file, pkg) => {
      if (!file || !pkg) debugger
      return shouldParse(moduleId, file, pkg)
    },
    // during parse, ignore missing modules
    ignoreMissing: true
  })
  md.end({ file: path.resolve(cwd, entryId) })

  let resolvePromise
  const parsePromise = new Promise(resolve => { resolvePromise = resolve })

  md
  // annotate with package name
    .pipe(createPackageDataStream({ rootPackageName }))
  // inspect
    .pipe(createConfigSpy({
      isBuiltin,
      onResult: resolvePromise
    }))
    .resume()

  // get initial config from configSpy
  const initialSerializedConfig = await parsePromise
  const config = JSON.parse(initialSerializedConfig)

  return config


  function shouldParse (moduleId, file, pkg) {
    // debugger
    // non-relative files are fine
    // console.log('shouldParse start', moduleId)
    // skip packages
    const looksLikePackage = !(moduleId.startsWith('/') || moduleId.startsWith('.'))
    if (looksLikePackage) {
      return !ignoreDependencies
    }
    const resolved = file || moduleId
    const extension = path.extname(resolved)
    // console.log('shouldParse', resolved, extension)
    // only supported extensions
    if (!['.js', '.cjs', '.mjs'].includes(extension)) {
      // log unfamiliar skips
      if (!['.json','.css', '.sass', '.coffee', '.node'].includes(extension)) {
        console.warn(`skipping unknown file type "${extension}" from file "${resolved}" under root package "${rootPackageName}"`)
      }
      return false
    }
    // otherwise ok
    return true
  }
}
