/* eslint no-eval: 0 */
const fs = require('fs')
const path = require('path')
const resolve = require('resolve')
const { sanitize } = require('htmlescape')
const { generateKernel, applySourceTransforms, makeInitStatsHook } = require('lavamoat-core')
const { getPackageNameForModulePath } = require('@lavamoat/aa')
const { checkForResolutionOverride } = require('./resolutions')
const { resolutionOmittedExtensions } = require('./parseForPolicy')
const { createFreshRealmCompartment } = require('./freshRealmCompartment')
const noop = () => {}

const nativeRequire = require

module.exports = { createKernel }

function createKernel ({ projectRoot, lavamoatPolicy, canonicalNameMap, debugMode, statsMode, scuttleGlobalThis, scuttleGlobalThisExceptions }) {
  const { resolutions } = lavamoatPolicy
  const getRelativeModuleId = createModuleResolver({ projectRoot, resolutions, canonicalNameMap })
  const loadModuleData = createModuleLoader({ canonicalNameMap })
  const kernelSrc = generateKernel({ debugMode, scuttleGlobalThis, scuttleGlobalThisExceptions })
  const createKernel = evaluateWithSourceUrl('LavaMoat/node/kernel', kernelSrc)
  const reportStatsHook = statsMode ? makeInitStatsHook({ onStatsReady }) : noop
  const kernel = createKernel({
    lavamoatConfig: lavamoatPolicy,
    loadModuleData,
    getRelativeModuleId,
    prepareModuleInitializerArgs,
    getExternalCompartment,
    globalThisRefs: ['global', 'globalThis'],
    reportStatsHook,
  })
  return kernel
}

function getExternalCompartment (packageName, packagePolicy) {
  const envPolicy = packagePolicy.env
  if (packagePolicy.env === 'unfrozen') {
    return createFreshRealmCompartment()
  }
  throw new Error(`LavaMoat/node - unrecognized "env" policy setting for package "${packageName}", "${envPolicy}"`)
}

function prepareModuleInitializerArgs (requireRelativeWithContext, moduleObj, moduleData) {
  const require = requireRelativeWithContext
  const module = moduleObj
  const exports = moduleObj.exports
  const __filename = moduleData.file
  const __dirname = path.dirname(__filename)
  require.resolve = (requestedName) => {
    return resolve.sync(requestedName, { basedir: __dirname })
  }
  return [exports, require, module, __filename, __dirname]
}

function createModuleResolver ({ projectRoot, resolutions, canonicalNameMap }) {
  return function getRelativeModuleId (parentAbsolutePath, requestedName) {
    // handle resolution overrides
    let parentDir = path.dirname(parentAbsolutePath)
    const parentPackageName = getPackageNameForModulePath(canonicalNameMap, parentDir)
    const result = checkForResolutionOverride(resolutions, parentPackageName, requestedName)
    if (result) {
      requestedName = result
      // if path is a relative path, it should be relative to the projectRoot
      if (!path.isAbsolute(result)) {
        parentDir = projectRoot
      }
    }
    // resolve normally
    const resolved = resolve.sync(requestedName, {
      basedir: parentDir,
      extensions: resolutionOmittedExtensions,
    })
    return resolved
  }
}

function createModuleLoader ({ canonicalNameMap }) {
  return function loadModuleData (absolutePath) {
    // load builtin modules (eg "fs")
    if (resolve.isCore(absolutePath)) {
      return {
        type: 'builtin',
        file: absolutePath,
        package: absolutePath,
        id: absolutePath,
        // wrapper around unprotected "require"
        moduleInitializer: (exports, require, module) => {
          module.exports = nativeRequire(absolutePath)
        },
      }
    // load compiled native module
    } else if (isNativeModule(absolutePath)) {
      const packageName = getPackageNameForModulePath(canonicalNameMap, absolutePath)
      return {
        type: 'native',
        file: absolutePath,
        package: packageName,
        id: absolutePath,
        // wrapper around unprotected "require"
        moduleInitializer: (exports, require, module) => {
          module.exports = nativeRequire(absolutePath)
        },
      }
    // load normal user-space module
    } else {
      const moduleContent = fs.readFileSync(absolutePath, 'utf8')
      // apply source transforms
      let transformedContent = moduleContent
      // hash bang
      const contentLines = transformedContent.split('\n')
      if (contentLines[0].startsWith('#!')) {
        transformedContent = contentLines.slice(1).join('\n')
      }

      transformedContent = applySourceTransforms(transformedContent)

      const isJSON = /\.json$/.test(absolutePath)
      // wrap json modules (borrowed from browserify)
      if (isJSON) {
        const sanitizedString = sanitize(transformedContent)
        try {
          // check json validity
          JSON.parse(sanitizedString)
          transformedContent = 'module.exports=' + sanitizedString
        } catch (err) {
          err.message = `While parsing ${absolutePath}: ${err.message}`
          throw err
        }
      }
      // ses needs to take a fucking chill pill
      if (isJSON) {
        transformedContent = transformedContent
          .split('-import-').join('-imp ort-')
      } else {
        transformedContent = transformedContent
          .split('"babel-plugin-dynamic-import-node').join('"babel-plugin-dynamic-imp" + "ort-node')
          .split('"@babel/plugin-proposal-dynamic-import').join('"@babel/plugin-proposal-dynamic-imp" + "ort')
          .split('// Re-export lib/utils, so that consumers can import').join('// Re-export lib/utils, so that consumers can imp_ort')
          .split('// babel-plugin-dynamic-import').join('// babel-plugin-dynamic-imp ort')
          .split('// eslint-disable-next-line import/no-unresolved').join('// eslint-disable-next-line imp_ort/no-unresolved')
      }
      // wrap in moducreateModuleResolverleInitializer
      // security: ensure module path does not inject code
      if (absolutePath.includes('\n')) {
        throw new Error('invalid newline in module source path')
      }
      const wrappedContent = `(function(exports, require, module, __filename, __dirname){\n${transformedContent}\n})`
      const packageName = getPackageNameForModulePath(canonicalNameMap, absolutePath)

      return {
        type: 'js',
        file: absolutePath,
        package: packageName,
        source: wrappedContent,
        id: absolutePath,
      }
    }
  }
}

function isNativeModule (filename) {
  const fileExtension = filename.split('.').pop()
  return fileExtension === 'node'
}

function evaluateWithSourceUrl (filename, content) {
  return eval(`${content}\n//# sourceURL=${filename}`)
}

function onStatsReady (moduleGraphStatsObj) {
  const graphId = Date.now()
  console.warn(`completed module graph init "${graphId}" in ${moduleGraphStatsObj.value}ms ("${moduleGraphStatsObj.name}")`)
  const statsFilePath = `./lavamoat-flame-${graphId}.json`
  console.warn(`wrote stats file to "${statsFilePath}"`)
  fs.writeFileSync(statsFilePath, JSON.stringify(moduleGraphStatsObj, null, 2))
}
